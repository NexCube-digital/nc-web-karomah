"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCashierProfile } from "@/lib/api";
import { clearAuthSession, getAuthToken, getStoredUser } from "@/lib/auth";
import { CashierUser } from "@/types";

export function useCashierSession() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CashierUser | null>(getStoredUser());
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      const authToken = getAuthToken();

      if (!authToken) {
        router.replace("/kasir/login");
        setIsChecking(false);
        return;
      }

      try {
        const profile = await fetchCashierProfile(authToken);
        setToken(authToken);
        setUser(profile);
      } catch {
        clearAuthSession();
        router.replace("/kasir/login");
      } finally {
        setIsChecking(false);
      }
    }

    bootstrap();
  }, [router]);

  return {
    token,
    user,
    isChecking,
  };
}
