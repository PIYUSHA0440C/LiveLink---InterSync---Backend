import { StreamChat } from "stream-chat";
import "dotenv/config";

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
    console.error("Stream API key and secret are missig in environment variables");
}

const streamClient = StreamChat.getInstance(apiKey, apiSecret);
export const upsertStreamUser = async (userData) => {
    try {
        await streamClient.upsertUser(userData);
        return userData;
    } catch (error) {
        console.error("Error in upserting Stream user", error);
        
    }
};

export const generateStreamToken = (userId) => {};