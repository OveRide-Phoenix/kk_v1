"use client";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Container, Title } from "@mantine/core";

export default function RegisterPage() {
  return (
    <Container size="sm">
      <Title mt="md">Register</Title>
      <RegisterForm />
    </Container>
  );
}
