"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { clearToken, getMe, getToken } from "@/lib/api";

type Me = Awaited<ReturnType<typeof getMe>>;

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    getMe()
      .then((user) => {
        if (user.role !== "super_admin") {
          clearToken();
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
        setMe(user);
      })
      .catch(() => {
        clearToken();
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      })
      .finally(() => setChecked(true));
  }, [pathname, router]);

  if (!checked || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0b0f]">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
      </div>
    );
  }

  return <>{children}</>;
}
