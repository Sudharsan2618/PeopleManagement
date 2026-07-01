# Callback Reminder System Implementation Guide

## Overview
This document describes the real-time callback reminder system implementation for telecallers. The system automatically notifies telecallers when scheduled callbacks are due, with sound alerts, desktop notifications, and periodic reminders.

## Features

### 1. **Real-Time Callback Detection**
- Polls the backend every 30 seconds for pending callbacks
- Automatically detects when a scheduled callback time has arrived
- Works in background without requiring page refresh

### 2. **Visual & Audio Notifications**
- **Modal Popup**: Displays prospect details (name, phone, course, reason, scheduled time)
- **Sound Alert**: Plays notification sound when callback is due
- **Browser Desktop Notification**: Native OS-level notification (with user permission)
- **Visual Indicators**: Blue animated bell icon and yellow notification banner

### 3. **Action Buttons**
- **Open Lead**: Opens the prospect's lead details for immediate action
- **Remind Me in 5 Min**: Postpones the reminder for 5 minutes (repeats automatically)
- **Dismiss**: Permanently dismisses the reminder for that callback

### 4. **Persistent State**
- Tracks notification status in database
- Prevents duplicate alerts across sessions
- Maintains reminder state across page refreshes

### 5. **Smart Reminders**
- Only shows reminder to assigned telecaller
- Repeats alert every 5 minutes if not dismissed
- Automatically closes when callback is completed
- Optional "Don't show again" checkbox

## Setup Instructions

### Database Migration

Run the migration script to add notification tracking columns to call_logs table:

```bash
cd c:\Users\thirs\Downloads\ppl management\PeopleManagement
psql -U postgres -d people_management -f migration_add_notification_fields.sql
```

**Columns Added:**
- `notification_shown` (BOOLEAN): Whether reminder has been shown
- `notification_dismissed` (BOOLEAN): Whether user dismissed the reminder
- `notification_last_shown_at` (TIMESTAMP): Last time reminder was displayed

### Backend Setup

The backend automatically handles notification status tracking via:

1. **New API Endpoints:**
   - `GET /call-logs/callbacks/pending` - Get pending callbacks for current user
   - `PATCH /call-logs/{id}/mark-notification-shown` - Mark notification as shown
   - `PATCH /call-logs/{id}/mark-notification-dismissed` - Mark as dismissed

2. **Schema Updates:**
   - Updated `CallLogBase` to include notification fields
   - Added validator to enforce callback_scheduled_at when outcome is "callback"

### Frontend Setup

1. **Components Created:**
   ```
   UI/components/callback-reminder-modal.tsx - Main reminder modal
   UI/components/callback-reminder-provider.tsx - Global provider
   UI/hooks/use-callback-reminder.ts - Polling & notification logic
   ```

2. **Integration:**
   - `CallbackReminderProvider` automatically added to root layout
   - Automatically starts polling on app load
   - Works across all pages without manual integration

3. **Polling Mechanism:**
   - Interval: Every 30 seconds
   - Automatic retry on errors
   - Graceful degradation if API unavailable

## API Schema

### CallLog Interface
```typescript
interface CallLog {
  id: number
  prospect_id: number
  telecaller_id: number
  outcome: string
  callback_scheduled_at?: string
  notification_shown: boolean
  notification_dismissed: boolean
  notification_last_shown_at?: string
  // ... other fields
}
```

## User Experience Flow

```
1. Telecaller logs in
   ↓
2. App automatically starts polling for pending callbacks
   ↓
3. When callback time arrives:
   ↓
   → Sound alert plays
   → Desktop notification appears
   → Modal popup shows
   ↓
4. Telecaller chooses action:
   ├─ "Open Lead" → Navigate to lead details
   ├─ "Remind Me in 5 Min" → Modal closes, reappears in 5 min
   └─ "Dismiss" → Permanently hide this callback
```

## Configuration

### Polling Interval (UI/hooks/use-callback-reminder.ts)
```typescript
const POLLING_INTERVAL = 30 * 1000  // 30 seconds (adjustable)
const REMINDER_REPEAT_INTERVAL = 5 * 60 * 1000  // 5 minutes (adjustable)
```

### Callback Time Window (UI/hooks/use-callback-reminder.ts)
```typescript
// Callback is considered "arrived" if within 2 minutes of scheduled time
const timeDiff = now.getTime() - scheduledTime.getTime()
const isTimeArrived = timeDiff >= 0 && timeDiff <= 2 * 60 * 1000
```

## Troubleshooting

### Notifications Not Showing
1. Check browser console for errors
2. Verify `notification_dismissed` is not set to true in database
3. Ensure callback time is set and in future
4. Check that user's browser allows notifications

### Polling Not Starting
1. Verify API endpoints are working: `GET /call-logs/callbacks/pending`
2. Check browser network tab for API calls every 30 seconds
3. Verify user is authenticated

### Sound Not Playing
1. Check browser audio settings
2. Verify audio is not muted globally
3. Check browser's notification audio permissions

## Browser Support

- **Chrome/Edge**: ✅ Full support (Desktop notifications + sound)
- **Firefox**: ✅ Full support (Desktop notifications + sound)
- **Safari**: ⚠️ Limited (Desktop notifications may require user interaction)
- **Mobile Browsers**: ⚠️ Notification support varies

## Security Considerations

1. **User Isolation**: Callbacks only shown to assigned telecaller
2. **State Persistence**: Notification status tracked server-side
3. **API Validation**: Backend validates all notification state changes
4. **Rate Limiting**: Polling limited to 30-second intervals

## Performance Notes

- Minimal impact on app performance
- Polling runs in background
- Modal only renders when needed
- Database queries optimized with indexes

## Future Enhancements

1. WebSocket integration for real-time (no polling needed)
2. Notification preferences (sound, desktop, modal options)
3. Callback grouping (multiple callbacks at same time)
4. Analytics (callback response times, missed callbacks)
5. Mobile app push notifications
