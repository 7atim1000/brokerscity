export const saveTokens = (tokens) => {
    localStorage.setItem("access_token", tokens.access);
    localStorage.setItem("refresh_token", tokens.refresh);
};

export const clearTokens = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
};

export const getAccessToken = () => {
    return localStorage.getItem("access_token");
};

// Authorization
export const authFetch = (url, options = {}) => {
    const token = getAccessToken();

    const headers = options.headers ? { ...options.headers } : {};

    if (token) headers["Authorization"] = `Bearer ${token}`;

    // 🔄 CHANGED: don't set Content-Type when body is FormData.
    // When we upload files, the browser MUST set Content-Type itself
    // (it includes the multipart boundary). Forcing application/json
    // here breaks file uploads — Django tries to parse the body as JSON
    // and returns "JSON parse error".
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    return fetch(url, {
        ...options,
        headers,
    });
};


// export const saveTokens = (tokens) => {
//     localStorage.setItem("access_token", tokens.access);
//     localStorage.setItem("refresh_token", tokens.refresh);
// };

// export const clearTokens = () => {
//     localStorage.removeItem("access_token");
//     localStorage.removeItem("refresh_token");
// };

// export const getAccessToken = () => {
//     return localStorage.getItem("access_token");
// };

// // Authorization
// export const authFetch = (url, options = {}) => {
//    const token = getAccessToken();

//    const headers = options.headers
//         ? { ...options.headers } 
//         : {};

//    if (token) headers["Authorization"] = `Bearer ${token}`;
// //    if (token) {
// //         headers["Authorization"] = `Bearer ${token}`;
// //     }
//    headers["Content-Type"] = "application/json" ;

//    return fetch (url, {
//     ...options,
//     headers,
//    });
// }





        //             LOGIN
        //               │
        //               ▼
        //       /api/token/
        //               │
        //               ▼
        //       access_token
        //               │
        //               ▼
        //       localStorage
        //               │
        //               ▼
        //            Home
        //               │
        //               ▼
        //         /api/me/
        //               │
        //      ┌────────┴────────┐
        //      ▼                 ▼
        //   username            role
        //                        │
        //              ┌─────────┴─────────┐
        //              ▼                   ▼
        //           vendor                user
        //              │                   │
        //              ▼                   ▼
        //       Dashboard shown       Dashboard hidden