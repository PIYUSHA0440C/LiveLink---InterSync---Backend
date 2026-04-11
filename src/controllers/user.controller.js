import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';

export async function getRecommendedUsers(req, res) {

    try {
        const currentUserId = req.user.id;
        const currentUser = req.user;

        const recommendedUsers = await User.find({
            $and: [
                { _id: { $ne: currentUserId } }, // Exclude the current user
                { $id: { $nin: currentUser.friends } }, // Exclude existing friends
                { isOnboarded: true } // Only include onboarded users
            ]
        })

        res.status(200).json(recommendedUsers);
    }
    catch (error) {
        console.error("Error fetching recommended users:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function getMyFriends(req, res) {
    try {
        const user = await User.findById(req.user.id).select("friends").populate("friends", "fullName email profilePicture nativeLanguage learningLanguage");
        res.status(200).json(user.friends);
    }
    catch (error) {
        console.error("Error fetching friends:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function sendFriendRequest(req, res) {
    try {
        const myId = req.user.id;
        const { id: recipientId } = req.params;

        // prevent sending request ourself
        if (myId === recipientId) {
            return res.status(400).json({ message: "You can't send friend request to yourself" })
        }

        // check if recipient user exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({ message: "Recipient user not found" });
        }

        // check if we are already friends
        if (recipient.friends.includes(myId)) {
            return res.status(400).json({ message: "You are already friends with this user" });
        }

        // check if friend request already sent
        const existingRequest = await FriendRequest.findOne({
            $or: [
                { sender: myId, recipient: recipientId },
                { sender: recipientId, recipient: myId }
            ]
        });
        if (existingRequest) {
            return res.status(400).json({ message: "Friend request already sent or received" });
        }

        // create friend request
        const friendRequest = await FriendRequest.create({
            sender: myId,
            recipient: recipientId
        });

        res.status(201).json(friendRequest);

    } catch (error) {
        console.error("Error in sendFriendRequest controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function acceptFriendRequest(req, res) {
    try {
        const { id: requestId } = req.params;
        const friendRequest = await FriendRequest.findById(requestId);

        if (!friendRequest) {
            return res.status(404).json({ message: "Friend request not found" });
        }

        // verify that the logged in user is the recipient of this friend request
        if (friendRequest.recipient.toString() !== req.user.id) {
            return res.status(403).json({ message: "You are not authorized to accept this friend request" });
        }

        friendRequest.status = "accepted";
        await friendRequest.save();

        //add each user to the other user's friends list
        await User.findByIdAndUpdate(friendRequest.sender, {
            $addToSet: { friends: friendRequest.recipient }
        });

        await User.findByIdAndUpdate(friendRequest.recipient, {
            $addToSet: { friends: friendRequest.sender }
        });

        res.status(200).json({ message: "Friend request accepted" });

    } catch (error) {
        console.error("Error in acceptFriendRequest controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function getFriendRequests(req, res) {
    try {
        const incomingReqs = await FriendRequest.find({
            recipient: req.user.id,
            status: "pending",
        }).populate("sender", "fullName profilePicture nativeLanguage learningLanguage");

        const acceptedReqs = await FriendRequest.find({
            sender: req.user.id,
            status: "accepted",
        }).populate("recipient", "fullName profilePicture");

        res.status(200).json({ incomingReqs, acceptedReqs });

    }
    catch (error) {
        console.error("Error fetching friend requests:", error.message);
        console.error("Error in getFriendRequests controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function getOutGoingFriendRequests(req, res) {
    try {
        const outgoingReqs = await FriendRequest.find({
            sender: req.user.id,
            status: "pending",
        }).populate("recipient", "fullName profilePicture nativeLanguage learningLanguage");

        res.status(200).json(outgoingReqs);

    }
    catch (error) {
        console.error("Error fetching outgoing friend requests:", error.message);
        console.error("Error in getOutGoingFriendRequests controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}