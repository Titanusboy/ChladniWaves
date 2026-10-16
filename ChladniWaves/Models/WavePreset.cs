namespace ChladniWaves.Models;

public class WavePreset
{
    public string Name { get; set; } = "";
    public float[] Directions { get; set; } = Array.Empty<float>(); // углы в градусах
    public float Wavelength { get; set; } = 8f;
    public float Amplitude { get; set; } = 1f;
    public float Speed { get; set; } = 2f;

    public bool IsRandom { get; set; } = false;

    public static readonly WavePreset[] All = new[]
    {
        new WavePreset
        {
            Name = "Chladni",
            Directions = new[] { 0f, 60f, 120f },
            Wavelength = 8f, Amplitude = 1f, Speed = 2f
        },
        new WavePreset
        {
            Name = "Interference",
            Directions = new[] { 0f, 90f },
            Wavelength = 6f, Amplitude = 1.2f, Speed = 2.5f
        },
        new WavePreset
        {
            Name = "Quantum",
            Directions = new[] { 0f, 45f, 90f, 135f },
            Wavelength = 5f, Amplitude = 0.9f, Speed = 3f
        },
        new WavePreset
        {
            Name = "Chaos",
            Directions = Array.Empty<float>(),   // заполнится рандомом при клике
            Wavelength = 7f, Amplitude = 1.1f, Speed = 1.8f,
            IsRandom = true
        },
        new WavePreset
        {
            Name = "Rose",
            Directions = new[] { 0f, 72f, 144f },
            Wavelength = 6.5f, Amplitude = 1f, Speed = 2f
        }
    };
}