"use client";

import { useState, useEffect } from "react";
import { TextInput, Button, Select, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { registerUser, getAvailableCities } from "@/lib/api";

export function RegisterForm() {
  const [cities, setCities] = useState<string[]>([]);

  // ✅ Fetch available cities on mount
  useEffect(() => {
    getAvailableCities().then(setCities);
  }, []);

  const form = useForm({
    initialValues: {
      referredBy: "",
      phone: "",
      altPhone: "",
      name: "",
      recipient: "",
      addressType: "",
      house: "",
      fullAddress: "",
      city: "",
      pinCode: "",
      email: "",
    },
    validate: {
      phone: (value) =>
        /^\d{10}$/.test(value) ? null : "Phone number must be exactly 10 digits",
      name: (value) => (value ? null : "Name is required"),
      fullAddress: (value) => (value ? null : "Address is required"),
      city: (value) => (value ? null : "City is required"),
    },
  });

  const handleRegister = async () => {
    if (!form.validate().hasErrors) {
      const response = await registerUser(form.values);
      if (response.success) {
        alert("Registration successful!");
      } else {
        alert("Error registering user.");
      }
    }
  };

  return (
    <Stack gap="md"> {/* ✅ Correct spacing prop */}
      <TextInput label="Referred By" {...form.getInputProps("referredBy")} />
      <TextInput label="Primary Mobile" required {...form.getInputProps("phone")} />
      <TextInput label="Alternative Mobile" {...form.getInputProps("altPhone")} />
      <TextInput label="Customer Name" required {...form.getInputProps("name")} />
      <TextInput label="Delivery To (Food Receiver Name)" required {...form.getInputProps("recipient")} />
      <Select label="Address Type" data={["HOME", "WORK"]} {...form.getInputProps("addressType")} />
      <TextInput label="House/Apartment" {...form.getInputProps("house")} />
      <TextInput label="Full Address" required {...form.getInputProps("fullAddress")} />

      {/* ✅ Fixing Select binding */}
      <Select
        label="City"
        data={cities}
        required
        value={form.values.city}
        onChange={(value) => form.setFieldValue("city", value || "")}
      />

      <TextInput label="Pin Code" required {...form.getInputProps("pinCode")} />
      <TextInput label="Email" {...form.getInputProps("email")} />
      <Button onClick={handleRegister}>Register</Button>
    </Stack>
  );
}
