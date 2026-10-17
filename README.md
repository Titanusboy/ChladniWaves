# ChladniWaves 🌊

Интерактивная 3D-визуализация фигур Хладни на Blazor WebAssembly + Three.js.

## 📖 О проекте

Проект представляет собой интерактивный стенд для демонстрации волновых процессов, интерференции и формирования фигур Хладни в реальном времени. В основе лежит математическое моделирование колебаний упругой пластины.

Реализовано два независимых подхода к физике:
1. **Суперпозиция плоских волн.** Сумма парных бегущих волн, образующих стоячие волны с фиксированными узловыми линиями.
2. **Собственные моды мембраны.** Точное решение задачи Штурма-Лиувилля для квадратной мембраны с закреплёнными краями.

Для разделения динамики и структуры используется пространственная огибающая `E(x,y)`. Высота столбиков показывает мгновенную амплитуду `z(x,y,t)`, а цвет — огибающую.

---

## 🛠️ Инструкция по развёртыванию (Windows Server / Windows 10/11)

Для запуска проекта на Windows мы используем **IIS (Internet Information Services)**.

### Шаг 1. Требования

- Windows (любая версия, права администратора).
- .NET 10 SDK (для сборки).
- IIS с модулем URL Rewrite.

### Шаг 2. Установка .NET SDK и IIS

1. Скачайте и установите .NET 10 SDK: https://dotnet.microsoft.com/download/dotnet/10.0
2. Установите IIS:
   - Откройте «Панель управления» -> «Программы и компоненты» -> «Включение или отключение компонентов Windows».
   - Поставьте галочку на «Службы IIS» (Internet Information Services).
   - Разверните «Службы IIS» -> «Службы WWW» -> «Общие функции HTTP» и убедитесь, что включены «Статическое содержимое» и «Перенаправление HTTP».
3. Установите URL Rewrite Module 2 (критично для Blazor): https://www.iis.net/downloads/microsoft/url-rewrite

### Шаг 3. Сборка проекта

Откройте PowerShell или Командную строку и выполните:

    git clone https://github.com/Titanusboy/ChladniWaves.git
    cd ChladniWaves
    dotnet publish -c Release -o ./publish

Готовые файлы появятся в папке `publish\wwwroot`.

### Шаг 4. Создание файла web.config

В папке `publish\wwwroot` создайте файл web.config (если его там нет) и вставьте в него этот код. Он нужен, чтобы IIS правильно раздавал `.wasm` файлы и не выдавал ошибку 404 при обновлении страницы:

    <?xml version="1.0" encoding="utf-8"?>
    <configuration>
      <system.webServer>
        <staticContent>
          <remove fileExtension=".wasm" />
          <mimeMap fileExtension=".wasm" mimeType="application/wasm" />
          <remove fileExtension=".dll" />
          <mimeMap fileExtension=".dll" mimeType="application/octet-stream" />
          <remove fileExtension=".json" />
          <mimeMap fileExtension=".json" mimeType="application/json" />
          <remove fileExtension=".dat" />
          <mimeMap fileExtension=".dat" mimeType="application/octet-stream" />
          <remove fileExtension=".blat" />
          <mimeMap fileExtension=".blat" mimeType="application/octet-stream" />
        </staticContent>
        <rewrite>
          <rules>
            <rule name="SPA Routes" stopProcessing="true">
              <match url=".*" />
              <conditions logicalGrouping="MatchAll">
                <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
              </conditions>
              <action type="Rewrite" url="/index.html" />
            </rule>
          </rules>
        </rewrite>
      </system.webServer>
    </configuration>

### Шаг 5. Настройка сайта в IIS

1. Нажмите Win + R, введите inetmgr и нажмите Enter (откроется Диспетчер IIS).
2. Слева разверните ваш сервер, нажмите правой кнопкой на «Сайты» -> «Добавить веб-сайт...».
3. Имя сайта: ChladniWaves.
4. Физический путь: укажите путь к вашей папке `C:\...\ChladniWaves\publish\wwwroot` (именно wwwroot!).
5. Порт: 80 (или любой другой, если 80 занят).
6. Нажмите ОК.

### Шаг 6. Права доступа

Чтобы IIS мог читать файлы, дайте права группе IIS_IUSRS на папку wwwroot.

1. Нажмите правой кнопкой на папку `publish\wwwroot` -> Свойства -> вкладка Безопасность.
2. Нажмите Изменить -> Добавить.
3. Введите IIS_IUSRS и нажмите Проверить имена -> ОК.
4. Дайте этой группе права на Чтение и выполнение.
5. Нажмите ОК.

### Шаг 7. Проверка

Откройте браузер и зайдите на http://localhost (или IP-адрес сервера). Вы должны увидеть 3D-сцену.