namespace ChladniWaves.Services;

public enum VisualMode { Pillars, Sand }

public class SceneStateService
{
    public event Action? Changed;
    public event Action<VisualMode>? ModeChanged;
    public event Action? ScatterRequested;
    public event Action<string>? PaletteChanged;
    public event Action<string>? CameraModeChanged;
    public event Action? ScreenshotRequested;
    public event Action<Models.WavePreset>? PresetApplied;

    public bool ShowGraphs { get; set; } = false;
    public bool ShowWaveform { get; set; } = true;
    public bool ShowCrossSection { get; set; } = true;

    // ─── Режим физики ──────────────────────────────────────────
    private bool _plateMode = false;
    public bool PlateMode
    {
        get => _plateMode;
        set
        {
            if (_plateMode != value)
            {
                _plateMode = value;
                PlateModeChanged?.Invoke(value);
            }
        }
    }
    public event Action<bool>? PlateModeChanged;

    private int _modeM = 3;
    public int ModeM
    {
        get => _modeM;
        set
        {
            int v = Math.Clamp(value, 1, 6);
            if (_modeM != v)
            {
                _modeM = v;
                PlateModeChanged?.Invoke(_plateMode);
            }
        }
    }

    private int _modeN = 3;
    public int ModeN
    {
        get => _modeN;
        set
        {
            int v = Math.Clamp(value, 1, 6);
            if (_modeN != v)
            {
                _modeN = v;
                PlateModeChanged?.Invoke(_plateMode);
            }
        }
    }

    // Удобно вычислять частоту прямо в UI
    public float ModeFrequency => MathF.Sqrt(_modeM * _modeM + _modeN * _modeN);

    // ─── Волновые параметры ───────────────────────────────────
    private float _wavelength = 8.0f;
    public float Wavelength
    {
        get => _wavelength;
        set { if (MathF.Abs(_wavelength - value) > 0.001f) { _wavelength = value; Changed?.Invoke(); } }
    }

    private float _amplitude = 1.0f;
    public float Amplitude
    {
        get => _amplitude;
        set { if (MathF.Abs(_amplitude - value) > 0.001f) { _amplitude = value; Changed?.Invoke(); } }
    }

    private float _speed = 2.0f;
    public float Speed
    {
        get => _speed;
        set { if (MathF.Abs(_speed - value) > 0.001f) { _speed = value; Changed?.Invoke(); } }
    }

    private float _timeScale = 1.0f;
    public float TimeScale
    {
        get => _timeScale;
        set { if (MathF.Abs(_timeScale - value) > 0.001f) { _timeScale = value; Changed?.Invoke(); } }
    }

    // ─── Режим визуализации ───────────────────────────────────
    private VisualMode _mode = VisualMode.Pillars;
    public VisualMode Mode
    {
        get => _mode;
        set
        {
            if (_mode != value)
            {
                _mode = value;
                ModeChanged?.Invoke(value);
            }
        }
    }

    public void RequestScatter() => ScatterRequested?.Invoke();

    // ─── Палитра ──────────────────────────────────────────────
    private string _paletteName = "neon";
    public string PaletteName
    {
        get => _paletteName;
        set
        {
            if (_paletteName != value)
            {
                _paletteName = value;
                PaletteChanged?.Invoke(value);
            }
        }
    }

    // ─── Камера ───────────────────────────────────────────────
    public void SetCameraMode(string mode) => CameraModeChanged?.Invoke(mode);

    // ─── Скриншот ─────────────────────────────────────────────
    public void RequestScreenshot() => ScreenshotRequested?.Invoke();

    // ─── Пресеты ──────────────────────────────────────────────
    public void ApplyPreset(Models.WavePreset preset)
    {
        if (preset.IsRandom)
        {
            var rnd = new Random();
            int count = rnd.Next(3, 6);
            var dirs = new float[count];
            for (int i = 0; i < count; i++)
                dirs[i] = (float)(rnd.NextDouble() * 180.0);

            preset.Directions = dirs;
            preset.Wavelength = 5f + (float)rnd.NextDouble() * 6f;
            preset.Amplitude = 0.8f + (float)rnd.NextDouble() * 0.6f;
            preset.Speed = 1.5f + (float)rnd.NextDouble() * 2f;

            _wavelength = preset.Wavelength;
            _amplitude = preset.Amplitude;
            _speed = preset.Speed;
        }
        else
        {
            _wavelength = preset.Wavelength;
            _amplitude = preset.Amplitude;
            _speed = preset.Speed;
        }

        _timeScale = 1.0f;
        PresetApplied?.Invoke(preset);
        Changed?.Invoke();
    }
}