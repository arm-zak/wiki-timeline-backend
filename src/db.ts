import mongoose from "mongoose";

const mongodbUser = process.env.MONGO_USER
const mongodbPass = process.env.MONGO_PASS
const mongodbUrl = process.env.MONGO_URL

export async function initDbConnnection() {
    await mongoose.connect(`mongodb+srv://${mongodbUser}:${mongodbPass}@${mongodbUrl}/event-questions?retryWrites=true&w=majority`);
}
