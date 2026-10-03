# Ebdaey — Zoom App Test Plan (for Zoom App Review)

## App summary

Ebdaey is a learning marketplace where mentors sell live courses and one-on-one
consultations. The Zoom integration lets a mentor connect their own Zoom account so that
Ebdaey creates a Zoom meeting automatically whenever a live session or consultation is
scheduled, and shares the join link with enrolled students.

## Scopes requested and why

| Scope | Zoom API call | Where it is used |
| --- | --- | --- |
| `user:read:user` | `GET /v2/users/me` | Once, immediately after OAuth, to read the connected account's Zoom user ID so meetings are created under the correct host. |
| `meeting:write:meeting` | `POST /v2/users/{userId}/meetings` | When a mentor schedules a live course session or a consultation, to create the meeting and get the join URL. |
No other Zoom API endpoints are called. Ebdaey does not read participants, registrants,
past meetings, recordings, or account settings, and never updates or deletes meetings.

## Meeting security

All host-only security settings are sent inside the create-meeting request itself, so no
read or update scope is needed:

- The mentor is the only host (no alternative hosts, join-before-host off).
- Students join through the waiting room.
- Students join muted, with video off.
- Only the mentor can admit attendees, remove participants, or end the meeting.

## Test account

- URL: https://ebdaey.com
- Test mentor email: `<PROVIDE TEST MENTOR EMAIL>`
- Test mentor password: `<PROVIDE PASSWORD>`
- Test student email: `<PROVIDE TEST STUDENT EMAIL>`
- Test student password: `<PROVIDE PASSWORD>`
- Language: the dashboard has an English/Arabic switcher (top-right). Please switch to
  English before testing.

## Test steps

### 1. Install and authorize the app

1. Go to https://ebdaey.com and click **Sign in**.
2. Sign in with the test mentor credentials above.
3. In the left sidebar of the mentor dashboard, open **Integrations**.
4. On the **Zoom** card, click **Connect Zoom**.
5. You are redirected to Zoom's authorization page. Confirm the consent screen lists these
   permissions: view your user profile, create/manage meetings, read meeting details, and
   update meeting settings.
6. Click **Allow**.
7. You are redirected back to `https://ebdaey.com/zoom/oauth/callback` and then to the
   Integrations page, where the Zoom card now shows **Connected** with the Zoom account
   email.

_Expected result:_ Zoom shows as connected. (Internally this is the single
`GET /v2/users/me` call using `user:read:user`.)

### 2. Create a live session — meeting is created in Zoom

1. In the sidebar, open **Products → Live Courses** and click **New live course** (or open
   the existing course named "Zoom Review Test").
2. Fill in the title, set the price to 0, and add a session starting in about **30 minutes**
   with a duration of 30 minutes.
3. Save and publish the course.

_Expected result:_ At the moment you save, Ebdaey calls
`POST /v2/users/{userId}/meetings` (scope `meeting:write:meeting`) and stores the returned
meeting ID, join URL and host start URL. The session immediately shows a Zoom join link in
the mentor dashboard — no waiting.

4. Open https://zoom.us/meeting (Zoom web portal) with the same Zoom account and confirm
   the newly created meeting appears in **Upcoming meetings** with the same title and time.

### 3. Verify meeting security settings

1. In the Zoom web portal, open the meeting created in step 2.
2. Confirm the following settings are applied:
   - **Waiting Room**: On
   - **Mute participants upon entry**: On
   - **Host video**: On
   - **Participant video**: Off
   - **Join before host**: Off
   - **Only authenticated users can join**: Off (guests allowed via join URL)
   - **Alternative hosts**: Empty
3. As the mentor, click the host start URL from the Ebdaey dashboard.
4. As the student, open the join URL from the student dashboard in a separate browser/profile.

_Expected result:_ The student lands in the waiting room and cannot unmute, invite others, or
end the meeting. The mentor sees the waiting-room prompt and can admit the student. Only the
mentor has host controls.

### 4. Complete a purchase as a student and receive the join link

You will complete the purchase yourself with the test student account.

1. Open a private/incognito window and go to the mentor's public page:
   `https://ebdaey.com/mentor/<test-mentor-slug>`.
2. Open the live course created in step 2 and click **Buy / Book**.
3. Fill in the checkout form using the test student details (the course is priced at 0, so
   no payment information is requested and no charge occurs). Submit to complete the order.
4. Sign in as the student and open the **Student dashboard**.

_Expected result:_ The purchase confirmation email arrives and states that the meeting link
will be sent one hour before the appointment. The session appears under **Upcoming
appointments**.

5. Join link delivery — how the one-hour rule behaves:
   - A scheduled job runs every 5 minutes and emails the join link to both the student and
     the mentor **one hour before** the session starts (student gets the join URL, mentor
     gets the host start URL).
   - Because the session in step 2 starts in ~30 minutes (already inside the one-hour
     window), the join-link email is sent **within 5 minutes of the purchase** — no waiting
     for the hour boundary.
   - In the student dashboard the **Join Zoom** button is active as soon as the link exists;
     clicking it opens the Zoom meeting created in step 2.
   - If you instead schedule a session further out (e.g. tomorrow), the dashboard shows the
     session and the email is sent exactly one hour before its start time.

No extra Zoom API calls are made for this step — the join URL created in step 2 is reused.

### 5. Consultation booking (same scope, second entry point)

1. In the incognito window, open the mentor page and book a consultation slot starting in
   about 30 minutes, completing the booking with the test student account.
2. Sign in as the mentor and open **Upcoming appointments**.

_Expected result:_ A Zoom meeting is created for the booked slot at booking time (again only
`POST /v2/users/{userId}/meetings`), with a host start URL for the mentor and a join URL for
the student. Both parties receive the link one hour before the slot — or within 5 minutes of
booking when the slot is already less than an hour away, as in this test.



### 6. Remove / disconnect the app

Option A — from Ebdaey:

1. As the mentor, go to **Integrations**.
2. On the Zoom card, click **Disconnect** and confirm.

_Expected result:_ Ebdaey calls `POST https://zoom.us/oauth/revoke` for the access token and
deletes the stored Zoom credentials. The card returns to the **Connect Zoom** state.

Option B — from Zoom:

1. Go to https://marketplace.zoom.us/user/installed.
2. Find **Ebdaey** and click **Remove**.

_Expected result:_ The app is uninstalled; Ebdaey receives the deauthorization and stops
creating meetings for that mentor.

## Documentation and support

- Integration guide: https://ebdaey.com/zoom-integration
- Privacy policy: https://ebdaey.com/privacy-policy
- Terms of service: https://ebdaey.com/terms
- Support: support@ebdaey.com

---

## Release Notes for User (paste into Zoom submission)

Ebdaey requests only two permissions:

- `user:read:user` — read the connected mentor's Zoom user ID so meetings are created under the correct host.
- `meeting:write:meeting` — create the scheduled meeting for a live session or consultation.

Security settings (waiting room, join-before-host off, students muted on entry, no alternative hosts) are included in the create-meeting request, so no read or update permission is required.
