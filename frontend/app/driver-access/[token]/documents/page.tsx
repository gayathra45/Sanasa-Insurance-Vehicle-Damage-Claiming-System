"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DriverDocumentsRoute() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.token) {
      router.replace(`/driver-access/${params.token}?tab=documents`);
    }
  }, [params, router]);

  return null;
}
