using ChladniWaves.Models;

namespace ChladniWaves.Services;

public class WavePhysicsService
{
    public int GridSize { get; set; } = 32;
    public float Spacing { get; set; } = 1.0f;
    public List<Wave> Waves { get; } = new();

    public List<Impulse> Impulses { get; } = new();

    /// <summary>
    /// Считает высоту z(x, y, t) для всех столбиков.
    /// Возвращает массив длиной GridSize * GridSize.
    /// Индексация: index = i * GridSize + j.
    /// </summary>
    public float[] ComputeHeights(float time)
    {
        int n = GridSize;
        var heights = new float[n * n];
        float offset = (n - 1) * Spacing / 2f;

        int waveCount = Waves.Count;
        var kxArr = new float[waveCount];
        var kyArr = new float[waveCount];
        var ampArr = new float[waveCount];
        var omegaArr = new float[waveCount];
        var phaseArr = new float[waveCount];

        for (int w = 0; w < waveCount; w++)
        {
            var wave = Waves[w];
            kxArr[w] = wave.K * MathF.Cos(wave.Angle);
            kyArr[w] = wave.K * MathF.Sin(wave.Angle);
            ampArr[w] = wave.Amplitude;
            omegaArr[w] = wave.Omega;
            phaseArr[w] = wave.Phase;
        }

        // Копия импульсов для скорости (чтобы не читать List в двойном цикле)
        var impulses = Impulses.ToArray();
        int impCount = impulses.Length;

        for (int i = 0; i < n; i++)
        {
            float x = i * Spacing - offset;
            for (int j = 0; j < n; j++)
            {
                float y = j * Spacing - offset;
                float z = 0f;

                // 1. Стоячие волны
                for (int w = 0; w < waveCount; w++)
                {
                    z += ampArr[w] * MathF.Cos(kxArr[w] * x + kyArr[w] * y - omegaArr[w] * time + phaseArr[w]);
                }

                // 2. Импульсы от кликов
                for (int k = 0; k < impCount; k++)
                {
                    var imp = impulses[k];
                    float dx = x - imp.X;
                    float dy = y - imp.Z;
                    float r = MathF.Sqrt(dx * dx + dy * dy);
                    float age = time - imp.StartTime;
                    if (age < 0) continue;

                    float kk = 2f * MathF.PI / imp.Wavelength;
                    float om = kk * imp.Speed;
                    float spatial = MathF.Exp(-(r * r) / (2f * imp.Sigma * imp.Sigma));
                    // Плавное "включение" импульса за первые 0.15 сек
                    float attack = MathF.Min(1f, age / 0.15f);
                    float temporal = attack * MathF.Cos(kk * r - om * age) * MathF.Exp(-age / imp.Tau);

                    z += imp.Amplitude * spatial * temporal;
                }

                heights[i * n + j] = z;
            }
        }

        return heights;
    }

    /// <summary>
    /// Считает пространственную огибающую стоячей волны — БЕЗ времени.
    /// Возвращает нормированный массив: максимум = 1.0.
    /// Используется для цвета (цвет не должен пульсировать).
    /// </summary>
    public float[] ComputeEnvelope()
    {
        int n = GridSize;
        var env = new float[n * n];
        float offset = (n - 1) * Spacing / 2f;

        int waveCount = Waves.Count;
        var kxArr = new float[waveCount];
        var kyArr = new float[waveCount];
        var ampArr = new float[waveCount];
        var phaseArr = new float[waveCount];

        for (int w = 0; w < waveCount; w++)
        {
            var wave = Waves[w];
            kxArr[w] = wave.K * MathF.Cos(wave.Angle);
            kyArr[w] = wave.K * MathF.Sin(wave.Angle);
            ampArr[w] = wave.Amplitude;
            phaseArr[w] = wave.Phase;
        }

        float maxAbs = 0.0001f;

        for (int i = 0; i < n; i++)
        {
            float x = i * Spacing - offset;
            for (int j = 0; j < n; j++)
            {
                float y = j * Spacing - offset;
                float s = 0f;
                for (int w = 0; w < waveCount; w++)
                {
                    s += ampArr[w] * MathF.Cos(kxArr[w] * x + kyArr[w] * y + phaseArr[w]);
                }
                float a = MathF.Abs(s);
                env[i * n + j] = a;
                if (a > maxAbs) maxAbs = a;
            }
        }

        // Нормируем: максимум = 1.0
        for (int k = 0; k < env.Length; k++)
        {
            env[k] /= maxAbs;
        }

        return env;
    }


    /// <summary>
    /// Точное решение задачи о колебаниях квадратной мембраны
    /// с закреплёнными краями (мода m, n).
    /// z(x, y, t) = A · sin(mπx/L) · sin(nπy/L) · cos(ω_mn · t)
    /// </summary>
    public float[] ComputePlateMode(float time, int m, int n)
    {
        int N = GridSize;
        var heights = new float[N * N];
        float L = (N - 1) * Spacing;
        float offset = (N - 1) * Spacing / 2f;

        // Амплитуда и скорость берём из первой волны — так слайдеры работают
        float ampScale = Waves.Count > 0 ? Waves[0].Amplitude : 1.0f;
        float speedScale = Waves.Count > 0 ? Waves[0].Speed / 2f : 1.0f;  // нормируем: скорость 2 = 1×
        if (speedScale <= 0.01f) speedScale = 0.01f;

        // c — «скорость волны в среде мембраны», модифицируется слайдером скорости
        float c = 6.0f * speedScale;
        float omega = c * MathF.PI * MathF.Sqrt(m * m + n * n) / L;
        float A = ampScale;

        var impulses = Impulses.ToArray();
        int impCount = impulses.Length;

        for (int i = 0; i < N; i++)
        {
            float x = i * Spacing;
            float sx = MathF.Sin(m * MathF.PI * x / L);
            float worldX = x - offset;

            for (int j = 0; j < N; j++)
            {
                float y = j * Spacing;
                float sy = MathF.Sin(n * MathF.PI * y / L);

                float z = A * sx * sy * MathF.Cos(omega * time);

                if (impCount > 0)
                {
                    float worldY = y - offset;
                    for (int k = 0; k < impCount; k++)
                    {
                        var imp = impulses[k];
                        float dx = worldX - imp.X;
                        float dy = worldY - imp.Z;
                        float r = MathF.Sqrt(dx * dx + dy * dy);
                        float age = time - imp.StartTime;
                        if (age < 0) continue;

                        float kk = 2f * MathF.PI / imp.Wavelength;
                        float om = kk * imp.Speed;
                        float spatial = MathF.Exp(-(r * r) / (2f * imp.Sigma * imp.Sigma));
                        float attack = MathF.Min(1f, age / 0.15f);
                        float temporal = attack * MathF.Cos(kk * r - om * age) * MathF.Exp(-age / imp.Tau);

                        z += imp.Amplitude * spatial * temporal;
                    }
                }

                heights[i * N + j] = z;
            }
        }
        return heights;
    }

    /// <summary>
    /// Огибающая моды (пространственная часть, без времени).
    /// Нормируется так же, как ComputeEnvelope — max = 1.0.
    /// </summary>
    public float[] ComputePlateModeEnvelope(int m, int n)
    {
        int N = GridSize;
        var env = new float[N * N];
        float L = (N - 1) * Spacing;

        float maxAbs = 0.0001f;

        for (int i = 0; i < N; i++)
        {
            float x = i * Spacing;
            float sx = MathF.Sin(m * MathF.PI * x / L);

            for (int j = 0; j < N; j++)
            {
                float y = j * Spacing;
                float sy = MathF.Sin(n * MathF.PI * y / L);
                float a = MathF.Abs(sx * sy);

                env[i * N + j] = a;
                if (a > maxAbs) maxAbs = a;
            }
        }

        for (int k = 0; k < env.Length; k++) env[k] /= maxAbs;

        return env;
    }

    /// <summary>
    /// Собственная частота моды — для отображения в UI.
    /// </summary>
    public float GetModeFrequency(int m, int n)
    {
        int N = GridSize;
        float L = (N - 1) * Spacing;
        const float c = 6.0f;
        return c * MathF.PI * MathF.Sqrt(m * m + n * n) / L / (2f * MathF.PI);
    }
}