namespace ChladniWaves.Models;

public class Wave
{
    public float Amplitude { get; set; } = 1.0f;
    public float Wavelength { get; set; } = 8.0f;
    public float Angle { get; set; } = 0.0f;  // радианы
    public float Speed { get; set; } = 2.0f;
    public float Phase { get; set; } = 0.0f;

    // Волновое число k = 2π / λ
    public float K => 2.0f * MathF.PI / Wavelength;
    // Угловая частота ω = k * v
    public float Omega => K * Speed;
}