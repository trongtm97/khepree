"use client";

import { useEffect, useRef } from "react";

export function CheckoutFormPostHandoff({
  action,
  fields,
}: {
  action: string;
  fields: Array<{ name: string; value: string }>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.submit();
  }, []);

  return (
    <form ref={formRef} method="post" action={action} className="hidden">
      {fields.map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}
    </form>
  );
}
