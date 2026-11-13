// // src/components/AuthRoute.tsx
//
// import React, { JSX } from 'react';
// import { Navigate } from 'react-router-dom';
//
// interface AuthRouteProps {
//     children: JSX.Element;
// }
//
// const AuthRoute: React.FC<AuthRouteProps> = ({ children }) => {
//     const isAuthenticated = !!localStorage.getItem('token');
//
//     return isAuthenticated ? children : <Navigate to="/login" replace />;
// };
//
// export default AuthRoute;