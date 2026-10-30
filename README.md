# Sauna-

ESPHome control for a sauna with a **YCS18U10** display/keypad panel, using an ESP32 DevKit.

The ESP32 presses the panel's buttons through PhotoMOS relays and reads the POWER and
HEAT LEDs through optocouplers, so it is fully isolated from the sauna electronics.

## Files

| File | What it is |
|---|---|
| [`sauna.yaml`](sauna.yaml) | ESPHome config, flashed with ESPHome Device Builder |
| [`WIRING.md`](WIRING.md) | Parts list and pin-by-pin wiring |
| `secrets.yaml` | Wi-Fi and passwords. **Not in this repo** (gitignored); create it locally |

## What it exposes

- **Sauna** switch: real on/off. It only presses Power when the actual state differs.
- **Sauna power** / **Sauna heating** sensors, read from the panel LEDs.
- Buttons: Power, Temp +/−, Time +/−, Inside light, Outside light.
- Web UI at `http://sauna.local`.

## secrets.yaml

```yaml
wifi_ssid: "..."
wifi_password: "..."
sauna__ota_password: "..."
sauna__ap_password: "..."
sauna__api_key: "..."        # 32-byte base64; generate with the ESPHome wizard
sauna__web_password: "..."
```

## Safety

The ESP never powers the sauna on by itself after a boot or power cut. Keep the
sauna's own timer and thermal cutout as the real safety limits.
