"use client";

import { useState } from "react";
import { TextInput, Button, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { getCityByPhone } from "@/lib/api";

export function LoginForm() {
  const [city, setCity] = useState<string | null>(null);

  const form = useForm({
    initialValues: { phone: "", city: "" },
    validate: {
      phone: (value) =>
        /^\d{10}$/.test(value) ? null : "Phone number must be 10 digits",
    },
  });

  const handleLogin = async () => {
    if (!form.validate().hasErrors) {
      const fetchedCity = await getCityByPhone(form.values.phone);
      if (fetchedCity) {
        setCity(fetchedCity);
        form.setFieldValue("city", fetchedCity);
      } else {
        alert("User not found. Please register.");
      }
    }
  };

  return (
    <Stack gap="md"> {/* ✅ Correct way to set spacing */}
      <TextInput
        label="Phone Number"
        placeholder="Enter your phone number"
        {...form.getInputProps("phone")}
      />
      {city ? (
        <TextInput label="City" value={city} readOnly />
      ) : (
        <Button onClick={handleLogin}>Next</Button>
      )}
    </Stack>
  );
}
