// src/components/CallControls.js
import React from 'react';

const CallControls = ({ onRemoveUser, onMuteAll, onUnmuteAll, users }) => {
    return (
        <div>
            {users.length > 0 && (
                <>
                    <label htmlFor="removeUserSelect">Remove user</label>
                    <select
                        id="removeUserSelect"
                        onChange={(e) => onRemoveUser(e.target.value)}
                    >
                        <option value="">Select User</option>
                        {users.map((user) => (
                            <option key={user} value={user}>
                                {user}
                            </option>
                        ))}
                    </select>
                </>
            )}
            <button onClick={onMuteAll}>Mute All</button>
            <button onClick={onUnmuteAll}>Unmute All</button>
        </div>
    );
};

export default CallControls;