# WhatsApp Group Messaging Service (Baileys)

> **Primary Goal**: Automatically send **daily motivational quotes** to friends' groups.

This **NestJS** backend uses the **Baileys** library to connect to WhatsApp Web and schedule group messages.

---

## 1. Request Structure

* **Endpoint**: `POST /whatsapp/send-group`
* **Content-Type**: `application/json`

```json
{
  "groupName": "Notes",
  "message": "Hello everyone from NestJS!"
}
```

| Field       | Type     | Description                                          |
| ----------- | -------- | ---------------------------------------------------- |
| `groupName` | `string` | Exact subject of the WhatsApp group                  |
| `message`   | `string` | Text to send (perfect for daily motivational quotes) |

---

## 2. Possible Responses

| HTTP Status                   | JSON Response                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| **200 OK**                    | `{ "status": "success", "group": "Notes" }`                                                            |
| **404 Not Found**             | `{ "statusCode": 404, "message": "Group \"Notes\" not found", "error": "Not Found" }`                  |
| **500 Internal Server Error** | `{ "statusCode": 500, "message": "Internal error sending message", "error": "Internal Server Error" }` |

---

## 3. Internal Workflow

1. **Authentication**: Uses `useMultiFileAuthState` to store session credentials in `./auth/`.
2. **Group Sync**: Calls `groupFetchAllParticipating()` to load all participating groups.
3. **Message Delivery**: Sends text with `sendMessage(groupJid, { text })`.
4. **Auto-Reconnect**: Handles disconnects based on `DisconnectReason` and regenerates the QR when needed.

---

## 4. Use Cases

* **Daily Motivational Quotes**: Automate inspirational messages.
* **Team Reminders**: Notify about meetings, tasks, or deadlines.
* **Announcements**: Broadcast urgent updates to all team members.

---

## 5. Version 1 Limitations

* **No Authentication**: Public endpoint.
* **Groups Only**: Does not support individual contacts.
* **Single Instance**: No clustering or high availability.

---

## 6. API Documentation

Quick reference for available routes:

| Route                       | Method | Description                                |
| --------------------------- | ------ | ------------------------------------------ |
| `GET /`                     | GET    | Health check (`OK`)                        |
| `POST /whatsapp/send-group` | POST   | Send a message to a specific group by name |

---


