# Sauna-
binary_sensor:
  - platform: gpio
    id: sauna_on
    name: "Sauna power"
    pin: {number: GPIO25, mode: INPUT_PULLUP, inverted: true}
    filters:
      - delayed_off: 200ms
  - platform: gpio
    id: sauna_heating
    name: "Sauna heating"
    pin: {number: GPIO26, mode: INPUT_PULLUP, inverted: true}
    filters:
      - delayed_off: 200ms

switch:
  - platform: template
    name: "Sauna"
    lambda: return id(sauna_on).state;
    turn_on_action:
      - if:
          condition:
            binary_sensor.is_off: sauna_on
          then:
            - button.press: btn_power
    turn_off_action:
      - if:
          condition:
            binary_sensor.is_on: sauna_on
          then:
            - button.press: btn_power
