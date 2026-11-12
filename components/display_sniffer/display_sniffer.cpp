#include "display_sniffer.h"

#include <algorithm>
#include <cinttypes>
#include <string>

#include "esphome/core/log.h"

namespace esphome {
namespace display_sniffer {

static const char *const TAG = "display_sniffer";

// Pattern keys pack the bit count above the 32 data bits.
static uint64_t make_key(uint8_t count, uint32_t bits) { return (static_cast<uint64_t>(count) << 32) | bits; }

static std::string to_binary(uint32_t bits, uint8_t count) {
  const uint8_t n = std::min<uint8_t>(count, 32);
  std::string out;
  for (int i = n - 1; i >= 0; i--) {
    out += (bits >> i) & 1 ? '1' : '0';
    if (i > 0 && i % 8 == 0)
      out += ' ';
  }
  return out;
}

void DisplaySniffer::setup() {
  this->data_pin_->setup();
  this->clock_pin_->setup();
  this->isr_data_ = this->data_pin_->to_isr();
  this->last_report_ms_ = millis();
  this->clock_pin_->attach_interrupt(DisplaySniffer::gpio_intr, this, gpio::INTERRUPT_RISING_EDGE);
}

// 74HC164 shifts on the rising edge of CLK, so sample DATA there.
void IRAM_ATTR DisplaySniffer::gpio_intr(DisplaySniffer *arg) {
  const bool bit = arg->isr_data_.digital_read();
  const uint32_t now = micros();
  const uint32_t period = now - arg->last_edge_us_;
  arg->last_edge_us_ = now;
  arg->edges_++;

  if (period > arg->frame_gap_us_) {
    if (arg->cur_count_ > 0) {
      const uint16_t next = (arg->head_ + 1) % RING_SIZE;
      if (next == arg->tail_) {
        arg->overflows_++;
      } else {
        arg->ring_bits_[arg->head_] = arg->cur_bits_;
        arg->ring_count_[arg->head_] = arg->cur_count_;
        arg->head_ = next;
      }
    }
    arg->cur_bits_ = 0;
    arg->cur_count_ = 0;
  } else if (period < arg->min_period_us_) {
    arg->min_period_us_ = period;
  }

  arg->cur_bits_ = (arg->cur_bits_ << 1) | (bit ? 1 : 0);
  if (arg->cur_count_ < 255)
    arg->cur_count_++;
}

void DisplaySniffer::loop() {
  while (this->tail_ != this->head_) {
    const uint16_t tail = this->tail_;
    const uint8_t count = this->ring_count_[tail];
    const uint64_t key = make_key(count, this->ring_bits_[tail]);
    this->tail_ = (tail + 1) % RING_SIZE;

    this->frames_++;
    this->bit_counts_[count]++;
    auto it = this->patterns_.find(key);
    if (it != this->patterns_.end()) {
      it->second++;
    } else if (this->patterns_.size() < MAX_PATTERNS) {
      this->patterns_[key] = 1;
    } else {
      this->other_patterns_++;
    }
    if (this->sequence_.size() < SEQUENCE_LENGTH)
      this->sequence_.push_back(key);
  }

  if (millis() - this->last_report_ms_ >= this->report_interval_ms_)
    this->report_();
}

void DisplaySniffer::report_() {
  const uint32_t elapsed = millis() - this->last_report_ms_;
  this->last_report_ms_ = millis();
  const uint32_t edges = this->edges_;
  const uint32_t overflows = this->overflows_;
  const uint32_t min_period = this->min_period_us_;
  this->edges_ = 0;
  this->overflows_ = 0;
  this->min_period_us_ = UINT32_MAX;

  if (this->frames_ == 0) {
    ESP_LOGI(TAG, "No frames in %" PRIu32 " ms (%" PRIu32 " clock edges). Check DATA/CLK wiring.", elapsed, edges);
  } else {
    ESP_LOGI(TAG,
             "==== %" PRIu32 " frames in %" PRIu32 " ms (%.0f/s), %" PRIu32 " clock edges, fastest clock period %" PRIu32
             " us, %" PRIu32 " dropped",
             this->frames_, elapsed, this->frames_ * 1000.0f / elapsed, edges,
             min_period == UINT32_MAX ? 0 : min_period, overflows);

    std::string counts;
    for (auto &entry : this->bit_counts_)
      counts += str_sprintf(" %u bits x%" PRIu32, entry.first, entry.second);
    ESP_LOGI(TAG, "Frame lengths:%s", counts.c_str());

    std::vector<std::pair<uint64_t, uint32_t>> sorted(this->patterns_.begin(), this->patterns_.end());
    std::sort(sorted.begin(), sorted.end(), [](const auto &a, const auto &b) { return a.second > b.second; });
    ESP_LOGI(TAG, "Distinct frames (%u%s):", static_cast<unsigned>(sorted.size()),
             this->other_patterns_ > 0 ? str_sprintf(", %" PRIu32 " more not listed", this->other_patterns_).c_str() : "");
    for (size_t i = 0; i < sorted.size() && i < 24; i++) {
      const uint8_t count = sorted[i].first >> 32;
      const uint32_t bits = static_cast<uint32_t>(sorted[i].first);
      ESP_LOGI(TAG, "  %6" PRIu32 " x  %2u bits  0x%08" PRIX32 "  %s", sorted[i].second, count, bits,
               to_binary(bits, count).c_str());
    }

    std::string seq;
    for (uint64_t key : this->sequence_)
      seq += str_sprintf(" %04" PRIX32, static_cast<uint32_t>(key));
    ESP_LOGI(TAG, "First frames in order:%s", seq.c_str());
  }

  this->frames_ = 0;
  this->other_patterns_ = 0;
  this->patterns_.clear();
  this->bit_counts_.clear();
  this->sequence_.clear();
}

void DisplaySniffer::dump_config() {
  ESP_LOGCONFIG(TAG, "Display bus sniffer (capture mode):");
  LOG_PIN("  DATA pin: ", this->data_pin_);
  LOG_PIN("  CLK pin: ", this->clock_pin_);
  ESP_LOGCONFIG(TAG, "  Frame gap: %" PRIu32 " us", this->frame_gap_us_);
  ESP_LOGCONFIG(TAG, "  Report interval: %" PRIu32 " ms", this->report_interval_ms_);
}

}  // namespace display_sniffer
}  // namespace esphome
