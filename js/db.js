// ==========================================================================
// FIRESTORE DATA ACCESS
//
// Collections
//   rooms/{roomNo}  { roomNo, typeId, status: "available" | "occupied" | "cleaning" }
//   messages/{id}   { name, email, phone, topic, bookingCode, message,
//                     status: "New" | "Handled", uid, createdAt }
//   bookings/{id}   { code, uid, guestName, email, phone, typeId, roomNo,
//                     checkIn, checkOut, guests, nights, rate, subtotal, tax,
//                     total, status, payment, source, specialRequest, createdAt }
//
// Booking status lifecycle
//   Pending    -> online request, no room assigned yet
//   Confirmed  -> room assigned, guest in house (room is "occupied")
//   CheckedOut -> stay finished (room goes to "cleaning")
//   Cancelled  -> cancelled by the guest or the front desk
// ==========================================================================

import {
    collection,
    doc,
    getDocs,
    onSnapshot,
    query,
    where,
    orderBy,
    setDoc,
    updateDoc,
    writeBatch,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";
import { DEFAULT_INVENTORY } from "./data.js";

const roomsCol = collection(db, "rooms");
const bookingsCol = collection(db, "bookings");
const messagesCol = collection(db, "messages");

// Short human-friendly reference derived from the unique document id.
function bookingCode(id) {
    return "RES-" + id.slice(0, 6).toUpperCase();
}

function snapshotToList(snap) {
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --------------------------------------------------------------------------
// Rooms
// --------------------------------------------------------------------------
export async function seedRoomsIfEmpty() {
    const existing = await getDocs(roomsCol);
    if (!existing.empty) return false;

    const batch = writeBatch(db);
    DEFAULT_INVENTORY.forEach(room => batch.set(doc(roomsCol, room.roomNo), room));
    await batch.commit();
    return true;
}

export function watchRooms(callback, onError) {
    return onSnapshot(query(roomsCol, orderBy("roomNo")), snap => callback(snapshotToList(snap)), onError);
}

export function setRoomStatus(roomNo, status) {
    return updateDoc(doc(roomsCol, roomNo), { status });
}

// --------------------------------------------------------------------------
// Bookings
// --------------------------------------------------------------------------

// Guest (online) booking request. `booking` already contains the priced stay.
export async function createBookingRequest(uid, booking) {
    const ref = doc(bookingsCol);
    const record = {
        ...booking,
        code: bookingCode(ref.id),
        uid,
        roomNo: null,
        status: "Pending",
        payment: "Unpaid",
        source: "online",
        createdAt: serverTimestamp()
    };
    await setDoc(ref, record);
    return record;
}

// Front-desk walk-in: books and occupies a specific room in one transaction,
// so two staff members can never put guests in the same room.
export async function createWalkInBooking(uid, booking) {
    const ref = doc(bookingsCol);
    const roomRef = doc(roomsCol, booking.roomNo);

    return runTransaction(db, async tx => {
        const room = await tx.get(roomRef);
        if (!room.exists()) throw new Error(`Room #${booking.roomNo} does not exist in inventory.`);
        if (room.data().status !== "available") {
            throw new Error(`Room #${booking.roomNo} is ${room.data().status.toUpperCase()}. Choose an available room.`);
        }

        const record = {
            ...booking,
            code: bookingCode(ref.id),
            uid,
            status: "Confirmed",
            source: "walk-in",
            createdAt: serverTimestamp()
        };
        tx.set(ref, record);
        tx.update(roomRef, { status: "occupied" });
        return record;
    });
}

// Assigns an available room to a pending online booking and confirms it.
export function assignRoom(bookingId, roomNo) {
    const bookingRef = doc(bookingsCol, bookingId);
    const roomRef = doc(roomsCol, roomNo);

    return runTransaction(db, async tx => {
        const [booking, room] = await Promise.all([tx.get(bookingRef), tx.get(roomRef)]);
        if (!booking.exists() || booking.data().status !== "Pending") {
            throw new Error("This booking is no longer pending.");
        }
        if (!room.exists() || room.data().status !== "available") {
            throw new Error(`Room #${roomNo} is no longer available.`);
        }
        tx.update(bookingRef, { roomNo, status: "Confirmed" });
        tx.update(roomRef, { status: "occupied" });
    });
}

export async function checkOutBooking(booking) {
    const batch = writeBatch(db);
    batch.update(doc(bookingsCol, booking.id), { status: "CheckedOut", payment: "Paid" });
    if (booking.roomNo) batch.update(doc(roomsCol, booking.roomNo), { status: "cleaning" });
    await batch.commit();
}

export function cancelBooking(bookingId) {
    return updateDoc(doc(bookingsCol, bookingId), { status: "Cancelled" });
}

// Admin: every booking, newest first.
export function watchAllBookings(callback, onError) {
    return onSnapshot(query(bookingsCol, orderBy("createdAt", "desc")), snap => callback(snapshotToList(snap)), onError);
}

// Guest: only their own bookings (required by the security rules).
// Sorted client-side so no composite index is needed.
export function watchMyBookings(uid, callback, onError) {
    return onSnapshot(query(bookingsCol, where("uid", "==", uid)), snap => {
        const list = snapshotToList(snap);
        // A just-written booking has no server timestamp yet; treat it as newest.
        const time = b => b.createdAt?.toMillis?.() ?? Date.now();
        list.sort((a, b) => time(b) - time(a));
        callback(list);
    }, onError);
}

// --------------------------------------------------------------------------
// Contact messages
// --------------------------------------------------------------------------
export const MESSAGE_TOPICS = [
    "Booking question",
    "Change or cancel a booking",
    "Group or event enquiry",
    "Feedback",
    "Other"
];

// Anyone can send a message (signed in or not); only staff can read them.
export function sendContactMessage(message, uid = null) {
    return setDoc(doc(messagesCol), {
        ...message,
        uid,
        status: "New",
        createdAt: serverTimestamp()
    });
}

export function watchMessages(callback, onError) {
    return onSnapshot(query(messagesCol, orderBy("createdAt", "desc")), snap => callback(snapshotToList(snap)), onError);
}

export function setMessageStatus(messageId, status) {
    return updateDoc(doc(messagesCol, messageId), { status });
}
