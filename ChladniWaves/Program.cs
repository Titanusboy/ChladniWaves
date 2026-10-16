using ChladniWaves;
using ChladniWaves.Services;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });

// Наш сервис состояния — singleton, чтобы один и тот же экземпляр
// был доступен и в ControlPanel, и в Home.
builder.Services.AddSingleton<SceneStateService>();

await builder.Build().RunAsync();