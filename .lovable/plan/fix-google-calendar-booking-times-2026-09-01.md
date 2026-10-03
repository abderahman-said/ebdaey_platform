# Fix Google Calendar booking times

## Implementation
- Remove the hardcoded Cairo `+02:00` offset from calendar event timestamps.
- Send local appointment date/time together with the `Africa/Cairo` timezone so Google Calendar applies daylight-saving rules automatically.
- Keep duration calculations correct across hour and day boundaries for both new and updated events.
- Deploy the updated calendar sync function and verify the function is healthy.

## Technical details
- Update the shared Google Calendar timestamp helpers used by consultation and live-session event creation/update.
- Existing incorrectly timed events will be corrected the next time they are updated or re-synced; new events will be created at the booked time.
