import { useState, useEffect, useCallback, useContext } from 'react'; // 🟢 Import useContext and useCallback
import axios from 'axios';
import { UserContext } from '../providers/UserProvider'; // 🟢 Import UserContext

const apiUrl = process.env.REACT_APP_API_URL;

export const useSetup = () => {
    const { loginUser } = useContext(UserContext); // 🟢 Get loginUser from context
    const currentUserId = loginUser?.id; // 🟢 Safely get the user ID

    const [userId, setUserId] = useState(null); // Keep local state if needed elsewhere, but use currentUserId for fetching
    const [defCalendarInfo, setDefCalendarInfo] = useState(null);
    const [lectureInfo, setLectureInfo] = useState(null);

    // 🟢 Wrap fetchData in useCallback
    const fetchData = useCallback(async () => {
        // 🟢 Use the ID directly from context if available
        if (!currentUserId) {
            console.log("useSetup: No user ID available, aborting fetch.");
            setUserId(null); // Reset local state if needed
            setDefCalendarInfo(null);
            setLectureInfo(null);
            return;
        }

        console.log(`useSetup: Fetching data for user ID: ${currentUserId}`);
        try {
            const userResponse = await axios.get(
                `${apiUrl}/users/info`,
                { withCredentials: true }
            );

            const { user_info, calendar_info } = userResponse.data;

            setUserId(user_info.id); // Update local state if needed
            console.log('useSetup: Fetched User Info:', user_info);

            if (user_info.def_calendar === null) {
                console.log('useSetup: No default calendar set.');
                setDefCalendarInfo(null);
                setLectureInfo(null);
                return;
            }

            const defCalendar = calendar_info.find(
                (calendar) => calendar.id === user_info.def_calendar
            );
            setDefCalendarInfo(defCalendar);
            console.log('useSetup: Default Calendar:', defCalendar);

            if (defCalendar) { // Check if defCalendar was actually found
                const lectureResponse = await axios.post(
                    `${apiUrl}/kougi/get/${user_info.def_calendar}`,
                    null,
                    { withCredentials: true }
                );
                setLectureInfo(lectureResponse.data);
                console.log('useSetup: Fetched Lecture Info:', lectureResponse.data);
            } else {
                console.log('useSetup: Default calendar ID found but calendar data missing in list.');
                setLectureInfo(null); // Ensure lecture info is cleared if calendar isn't found
            }

            console.log('useSetup: Data fetch complete.');
        } catch (err) {
            console.error("useSetup: Data fetch failed:", err.response || err);
            // Optionally reset states on error
            // setUserId(null);
            // setDefCalendarInfo(null);
            // setLectureInfo(null);
        }
    }, [currentUserId]); // 🟢 Depend on currentUserId from context

    useEffect(() => {
        fetchData();
    }, [fetchData]); // 🟢 fetchData is now stable due to useCallback

    // 🟢 Expose refetch which simply calls the memoized fetchData
    const refetch = () => {
        console.log("useSetup: refetch triggered.");
        fetchData();
    };

    // 🟢 Return refetch along with other state
    return { userId, defCalendarInfo, lectureInfo, refetch };
};