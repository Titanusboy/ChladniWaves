namespace ChladniWaves.Models;

public class Impulse
{
    public float X { get; set; }            // позиция по X в мировых координатах
    public float Z { get; set; }            // позиция по Z (второе измерение сетки)
    public float StartTime { get; set; }    // момент создания (в _time)
    public float Amplitude { get; set; } = 2.5f;
    public float Sigma { get; set; } = 5f;  // ширина гауссовой огибающей
    public float Tau { get; set; } = 1.0f;  // время затухания (сек)
    public float Speed { get; set; } = 8f;  // скорость расширения кольца
    public float Wavelength { get; set; } = 4f;
}