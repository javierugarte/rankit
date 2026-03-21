"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CreateListModal from "./CreateListModal";

interface Props {
  userId: string;
}

export default function CreateListButton({ userId }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setShowModal(true);
    }
  }, [searchParams]);

  function handleClose() {
    setShowModal(false);
    router.replace("/home");
  }

  function handleCreated() {
    setShowModal(false);
    router.replace("/home");
    router.refresh();
  }

  if (!showModal) return null;

  return (
    <CreateListModal
      userId={userId}
      onClose={handleClose}
      onCreated={handleCreated}
    />
  );
}
