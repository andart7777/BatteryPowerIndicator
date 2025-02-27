import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const BatteryPowerIndicator = GObject.registerClass(
    {
        GTypeName: 'BatteryPowerIndicator'
    },
    class BatteryPowerIndicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, 'Battery Power Indicator', false);

            this.label = new St.Label({
                text: '🔋 --W',
                y_align: Clutter.ActorAlign.CENTER
            });
            this.add_child(this.label);

            // Массив для усреднения мощности
            this._powerValues = [];
            this._maxSamples = 10; // 10 секунд усреднения

            this._updatePower();
            this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
                this._updatePower();
                return GLib.SOURCE_CONTINUE;
            });
        }

        _updatePower() {
            try {
                const powerFile = Gio.File.new_for_path('/sys/class/power_supply/BAT0/power_now');
                const statusFile = Gio.File.new_for_path('/sys/class/power_supply/BAT0/status');
                const energyNowFile = Gio.File.new_for_path('/sys/class/power_supply/BAT0/energy_now');
                const capacityFile = Gio.File.new_for_path('/sys/class/power_supply/BAT0/capacity');

                const [powerSuccess, powerContents] = powerFile.load_contents(null);
                const [statusSuccess, statusContents] = statusFile.load_contents(null);
                const [energyNowSuccess, energyNowContents] = energyNowFile.load_contents(null);
                const [capacitySuccess, capacityContents] = capacityFile.load_contents(null);

                if (!powerSuccess || !statusSuccess) {
                    this.label.set_text('🔋 N/A');
                    return;
                }

                const power_mw = parseInt(powerContents.toString().trim(), 10) / 1000000; // μW в W
                const status = statusContents.toString().trim();
                let capacity = 'N/A';
                if (capacitySuccess) {
                    capacity = parseInt(capacityContents.toString().trim(), 10);
                }

                // Усреднение мощности
                this._powerValues.push(power_mw);
                if (this._powerValues.length > this._maxSamples) {
                    this._powerValues.shift();
                }
                const avgPower = this._powerValues.reduce((a, b) => a + b, 0) / this._powerValues.length;

                // Устанавливаем минимальный порог для power (1 Вт), чтобы избежать нереалистичных значений
                const effectivePower = avgPower < 1 ? 0 : avgPower;

                let icon, text;
                switch (status) {
                    case 'Charging':
                        icon = '⚡';
                        text = `${effectivePower.toFixed(1)}W (зарядка, ${capacity}%)`;
                        break;
                    case 'Discharging':
                        if (effectivePower < 1) {
                            icon = '🔌';
                            text = `0.0W (подключено?, ${capacity}%)`;
                        } else {
                            icon = '🔋';
                            let remainingTime = 'N/A';
                            if (energyNowSuccess && effectivePower > 0) {
                                const energyNow = parseInt(energyNowContents.toString().trim(), 10) / 1000000; // μWh в Wh
                                const hours = energyNow / effectivePower;
                                if (hours > 24) {
                                    remainingTime = `${Math.floor(hours / 24)}д`;
                                } else if (hours > 1) {
                                    remainingTime = `${Math.floor(hours)}ч`;
                                } else {
                                    const minutes = Math.round(hours * 60);
                                    remainingTime = `${minutes}м`;
                                }
                            }
                            text = `${effectivePower.toFixed(1)}W (разряд ~${remainingTime}, ${capacity}%)`;
                        }
                        break;
                    case 'Full':
                        icon = '🔌';
                        text = `0.0W (полный заряд, ${capacity}%)`;
                        break;
                    case 'Not charging':
                        icon = '🔌';
                        text = `0.0W (подключено, ${capacity}%)`;
                        break;
                    default:
                        icon = '🔋';
                        text = `N/A (${capacity}%)`;
                        break;
                }

                this.label.set_text(`${icon} ${text}`);
            } catch (e) {
                global.logError(`BatteryPowerIndicator: ошибка: ${e.message}`);
                this.label.set_text('🔋 Err');
            }
        }

        destroy() {
            if (this._timeoutId) {
                GLib.source_remove(this._timeoutId);
                this._timeoutId = null;
            }
            super.destroy();
        }
    }
);

class Extension {
    constructor() {
        this._indicator = null;
    }

    enable() {
        this._indicator = new BatteryPowerIndicator();
        Main.panel.addToStatusArea('battery-power-indicator', this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

export default Extension;
