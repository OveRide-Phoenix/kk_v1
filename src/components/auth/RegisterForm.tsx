"use client";
import { useState } from "react";
import { TextInput, Button, Select, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { registerUser, getAvailableCities } from "@/lib/api";

export function RegisterForm() {
  const [cities, setCities] = useState<string[]>([]);
  
  useState(() => {
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
      phone: (value) => (value.length === 10 ? null : "Invalid phone number"),
      name: (value) => (value ? null : "Name is required"),
      fullAddress: (value) => (value ? null : "Address is required"),
      city: (value) => (value ? null : "City is required"),
    },
  });

  const handleRegister = async () => {
    const response = await registerUser(form.values);
    if (response.success) {
      alert("Registration successful!");
    } else {
      alert("Error registering user.");
    }
  };

  return (
    <Stack spacing="md">
      <TextInput label="Referred By" {...form.getInputProps("referredBy")} />
      <TextInput label="Primary Mobile" required {...form.getInputProps("phone")} />
      <TextInput label="Alternative Mobile" {...form.getInputProps("altPhone")} />
      <TextInput label="Customer Name" required {...form.getInputProps("name")} />
      <TextInput label="Delivery To (Food Receiver Name)" required {...form.getInputProps("recipient")} />
      <Select label="Address Type" data={["HOME", "WORK"]} {...form.getInputProps("addressType")} />
      <TextInput label="House/Apartment" {...form.getInputProps("house")} />
      <TextInput label="Full Address" required {...form.getInputProps("fullAddress")} />
      <Select label="City" data={cities} required {...form.getInputProps("city")} />
      <TextInput label="Pin Code" required {...form.getInputProps("pinCode")} />
      <TextInput label="Email" {...form.getInputProps("email")} />
      <Button onClick={handleRegister}>Register</Button>
    </Stack>
  );
}
