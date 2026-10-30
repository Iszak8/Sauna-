# Sauna wiring

Panel: **YCS18U10** display/keypad board. ESP: **ESP32 DevKit**.

**Work with the sauna fully switched off at the breaker.**

## Parts

| Qty | Part | Used for |
|---|---|---|
| 7 | PhotoMOS relay: AQY212, TLP222A or G3VM-61A1 | Pressing the buttons |
| 2 | PC817 optocoupler | Reading the POWER and HEAT LEDs |
| 7 | 330 Ω resistor | Relay inputs |
| 2 | 1 kΩ resistor | Opto inputs |
| 1 | 5 V USB power supply | Powering the ESP32 (not from the sauna's CN2 header) |

## Buttons (ESP -> PhotoMOS -> sauna button)

The ESP side of every relay is wired the same way:

```
ESP GPIOxx ──[330Ω]── relay pin 1 (+)
ESP GND    ─────────── relay pin 2 (−)
relay pin 3 ────────── button pad A      (either way round:
relay pin 4 ────────── button pad B       PhotoMOS has no polarity)
```

| ESP pin | Function | Sauna button |
|---|---|---|
| GPIO16 | Power | SW? (find it) |
| GPIO17 | Temp + | SW? (find it) |
| GPIO18 | Temp − | SW? (find it) |
| GPIO19 | Time + | SW? (find it) |
| GPIO21 | Time − | SW? (find it) |
| GPIO22 | Inside light | **SW4** (IN_LAMP) |
| GPIO23 | Outside light | **SW5** (OUT_LAMP) |

### Find your buttons

The other five buttons are **SW2, SW3, SW6, SW8 and SW9**. Match each one to the
label on the front panel overlay. On each switch, find the pad pair that is **not**
already connected: set the multimeter to continuity, and the right pair beeps only
while you hold the button down. Solder the relay to those two pads, from the back
of the board.

## LEDs (sauna LED -> PC817 -> ESP)

```
sauna LED + ──[1kΩ]── PC817 pin 1 (anode)
sauna LED − ───────── PC817 pin 2 (cathode)
PC817 pin 4 (collector) ── ESP GPIOxx
PC817 pin 3 (emitter)   ── ESP GND
```

| ESP pin | Sauna LED |
|---|---|
| GPIO25 | **POWER** (green, LED1) |
| GPIO26 | **HEAT** (red, LED2) |

The LED's `+` leg is the longer leg, or the side *without* the flat edge on the
LED body. If the sensor never changes state, swap the two wires on PC817 pins 1 and 2.

## Power and ground

- Power the ESP32 from its own USB 5 V supply.
- **Don't** connect ESP GND to the sauna board. The relays and optos keep the two
  sides fully isolated.
- Leave CN2 (the ribbon cable) exactly as it is.
