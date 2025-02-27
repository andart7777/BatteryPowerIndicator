# Battery Power Indicator GNOME Extension

## Краткое описание
Battery Power Indicator — это расширение для GNOME Shell, которое отображает текущую мощность батареи (в ваттах) и оставшееся время работы в панели состояния. Оно полезно для пользователей ноутбуков, желающих мониторить энергопотребление и состояние батареи в реальном времени.

## Логика работы
Расширение анализирует данные из системных файлов в `/sys/class/power_supply/BAT0/` и отображает их в верхнем баре GNOME. Вот примеры отображения:

- **При зарядке**: `⚡ 40.0W (зарядка)` — показывает мощность, подаваемую на батарею, когда она заряжается.
- **При разряде**: `🔋 10.0W (разряд ~7ч 21м)` — отображает среднюю мощность разряда и примерное оставшееся время работы, рассчитанное на основе текущей энергии (`energy_now`) и усреднённого потребления (`avgPower`).
- **При полном заряде**: `🔌 0.0W (полный заряд)` — указывает, что батарея полностью заряжена и питание идёт от адаптера.
- **При подключении без зарядки**: `🔌 0.0W (подключено)` — показывает, что адаптер подключён, но батарея не заряжается.
- **Отсутствие данных**: `🔋 N/A` — отображается, если данные недоступны или произошла ошибка.

Значения мощности усредняются за последние 10 секунд, чтобы сгладить скачки. Время работы рассчитывается как `energy_now / avgPower`, где `energy_now` — текущая энергия батареи в ватт-часах, а `avgPower` — средняя мощность в ваттах.

## Что делать, если нет данных о питании
Если некоторые системные файлы (например, `energy_now`, `power_now`, `status`) отсутствуют или недоступны:
- Проверьте наличие альтернативных файлов, таких как `charge_now`, `charge_full`, `energy_full`, `current_now`, используя команду:
  ```bash
  for file in status power_now voltage_now current_now energy_now energy_full energy_full_design charge_now charge_full charge_full_design capacity capacity_level; do
      echo -n "/sys/class/power_supply/BAT0/$file: "
      cat /sys/class/power_supply/BAT0/$file 2>/dev/null || echo "Нет такого файла или каталога"
  done
  ```

- Если адаптер питания не определяется (нет AC/online или AC/power_now), расширение будет полагаться на низкие значения power_now (< 1 Вт) и статус Discharging, предполагая подключение адаптера.
- Если данные полностью отсутствуют, индикатор покажет 🔋 N/A. Проверьте права доступа к файлам в /sys/class/power_supply/ или обновите систему:
```bash
sudo dnf update
sudo dnf reinstall gnome-shell
```
## Для каких версий Linux
- Расширение разработано и протестировано для Fedora Linux 41 (Workstation Edition) с GNOME 47, работающим под Wayland и ядром Linux 6.11.11-300.fc41.x86_64.
- Оно должно работать на других дистрибутивах Linux с GNOME 47 и выше, но может потребовать адаптации, если структура файлов /sys/class/power_supply/ отличается.
Минимальная версия GJS: 1.78 (обычно поставляется с GNOME 47).
## Как установить
#### 1. Скачайте или склонируйте репозиторий:
- Скачайте архив с GitHub или используйте git:
```bash
git clone https://github.com/ваш_пользователь/battery-power-indicator.git
cd battery-power-indicator
```
#### 2. Установите расширение:
 - Создайте директорию для расширения:
```bash
mkdir -p ~/.local/share/gnome-shell/extensions/battery-power@custom
```
- Скопируйте файлы extension.js и metadata.json в эту директорию:

```bash
cp extension.js metadata.json ~/.local/share/gnome-shell/extensions/battery-power@custom/
```
#### Включите расширение:
- Откройте терминал и выполните:
```bash
Перенос
Копировать
gnome-extensions disable battery-power@custom 2>/dev/null || true
gnome-extensions enable battery-power@custom
```
- Перезапустите GNOME Shell:
    - Нажмите Alt + F2, введите r и нажмите Enter.
- Или выйдите из сеанса и войдите заново:
```bash
gnome-session-quit --logout
```
#### Проверка работы:
- Убедитесь, что индикатор появился в верхнем баре GNOME. Используйте команды для проверки состояния:
```bash
gnome-extensions info battery-power@custom
journalctl --user -b | grep -i "battery-power"
```
# Зависимости
- GNOME Shell 47 или выше.
- GJS (JavaScript для GNOME) версии 1.78 или новее.
- Доступ к файлам в /sys/class/power_supply/ (обычно доступны по умолчанию).
# Лицензия
Этот проект распространяется под лицензией [MIT License]