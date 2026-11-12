"""Passive listener for the sauna panel's display bus (74HC164 DATA/CLK on CN2).

Capture mode only: logs the raw frames so the segment/digit mapping can be
worked out. It never drives either pin.
"""

import esphome.codegen as cg
import esphome.config_validation as cv
from esphome import pins
from esphome.const import CONF_ID

display_sniffer_ns = cg.esphome_ns.namespace("display_sniffer")
DisplaySniffer = display_sniffer_ns.class_("DisplaySniffer", cg.Component)

CONF_DATA_PIN = "data_pin"
CONF_CLOCK_PIN = "clock_pin"
CONF_FRAME_GAP = "frame_gap"
CONF_REPORT_INTERVAL = "report_interval"

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(DisplaySniffer),
        cv.Required(CONF_DATA_PIN): pins.internal_gpio_input_pin_schema,
        cv.Required(CONF_CLOCK_PIN): pins.internal_gpio_input_pin_schema,
        # A pause in CLK longer than this ends one frame.
        cv.Optional(CONF_FRAME_GAP, default="50us"): cv.positive_time_period_microseconds,
        cv.Optional(CONF_REPORT_INTERVAL, default="5s"): cv.positive_time_period_milliseconds,
    }
).extend(cv.COMPONENT_SCHEMA)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    cg.add(var.set_data_pin(await cg.gpio_pin_expression(config[CONF_DATA_PIN])))
    cg.add(var.set_clock_pin(await cg.gpio_pin_expression(config[CONF_CLOCK_PIN])))
    cg.add(var.set_frame_gap_us(config[CONF_FRAME_GAP].total_microseconds))
    cg.add(var.set_report_interval_ms(config[CONF_REPORT_INTERVAL].total_milliseconds))
