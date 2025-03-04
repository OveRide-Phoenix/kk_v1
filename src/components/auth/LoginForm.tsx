"use client";
import { useState } from "react";
import { TextInput, Button, Select, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { getCityByPhone, registerUser } from "@/lib/api";

export function LoginForm() {
  const [city, setCity] = useState<string | null>(null);
  const form = useForm({
    initialValues: { phone: "", city: "" },
    validate: { phone: (value) => (value.length === 10 ? null : "Invalid phone number") },
  });

  const handleLogin = async () => {
    const fetchedCity = await getCityByPhone(form.values.phone);
    if (fetchedCity) {
      setCity(fetchedCity);
      form.setFieldValue("city", fetchedCity);
      // Proceed with login
    } else {
      alert("User not found. Please register.");
    }
  };

  return (
    <Stack spacing="md">
      <TextInput
        label="Phone Number"
        placeholder="Enter your phone number"
        {...form.getInputProps("phone")}
      />
      {city ? (
        <TextInput label="City" value={city} disabled />
      ) : (
        <Button onClick={handleLogin}>Next</Button>
      )}
    </Stack>
  );
}
