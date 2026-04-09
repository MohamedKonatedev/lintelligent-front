"use client";

import { useEffect } from "react";
import { addRecentProgram } from "@/app/hooks/useRecentPrograms";

type Props = {
  id: string;
  title: string;
  image?: string;
  url: string;
};

export default function TrackRecentProgram({
  id,
  title,
  image,
  url,
}: Props) {
  useEffect(() => {
    addRecentProgram({ id, title, image, url });
  }, [id, title, image, url]);

  return null;
}