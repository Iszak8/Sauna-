#pragma once

#include <cstdint>
#include <map>
#include <vector>

#include "esphome/core/component.h"
#include "esphome/core/hal.h"

namespace esphome {
namespace display_sniffer {

// Listens to the display shift-register bus and logs what it sees.
// Each frame is the run of CLK pulses between two pauses; the first bit
// clocked in ends up in the highest bit of `bits`.
class DisplaySniffer : public Component {
 public:
  void set_data_pin(InternalGPIOPin *pin) { this->data_pin_ = pin; }
  void set_clock_pin(InternalGPIOPin *pin) { this->clock_pin_ = pin; }
  void set_frame_gap_us(uint32_t gap) { this->frame_gap_us_ = gap; }
  void set_report_interval_ms(uint32_t interval) { this->report_interval_ms_ = interval; }

  void setup() override;
  void loop() override;
  void dump_config() override;
  float get_setup_priority() const override { return setup_priority::DATA; }

 protected:
  static void gpio_intr(DisplaySniffer *arg);
  void report_();

  static const uint16_t RING_SIZE = 1024;
  static const size_t MAX_PATTERNS = 64;
  static const size_t SEQUENCE_LENGTH = 24;

  InternalGPIOPin *data_pin_{nullptr};
  InternalGPIOPin *clock_pin_{nullptr};
  ISRInternalGPIOPin isr_data_;
  uint32_t frame_gap_us_{50};
  uint32_t report_interval_ms_{5000};

  // Written by the interrupt handler.
  volatile uint32_t cur_bits_{0};
  volatile uint8_t cur_count_{0};
  volatile uint32_t last_edge_us_{0};
  volatile uint32_t min_period_us_{UINT32_MAX};
  volatile uint32_t edges_{0};
  volatile uint32_t overflows_{0};
  volatile uint32_t ring_bits_[RING_SIZE];
  volatile uint8_t ring_count_[RING_SIZE];
  volatile uint16_t head_{0};
  volatile uint16_t tail_{0};

  // Main-loop statistics for the current report window.
  uint32_t last_report_ms_{0};
  uint32_t frames_{0};
  uint32_t other_patterns_{0};
  std::map<uint64_t, uint32_t> patterns_;
  std::map<uint8_t, uint32_t> bit_counts_;
  std::vector<uint64_t> sequence_;
};

}  // namespace display_sniffer
}  // namespace esphome
