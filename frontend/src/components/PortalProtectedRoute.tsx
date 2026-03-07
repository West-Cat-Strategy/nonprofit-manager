interface PortalProtectedRouteProps {
  children: React.ReactNode;
}

export default function PortalProtectedRoute({ children }: PortalProtectedRouteProps) {
  return <>{children}</>;
}
