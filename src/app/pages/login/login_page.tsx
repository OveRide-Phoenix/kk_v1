"use client";
import { LoginForm } from "@/components/auth/LoginForm";
import { Container, Title } from "@mantine/core";

export default function LoginPage() {
  return (
    <Container size="xs">
      <Title mt="md">Login</Title>
      <LoginForm />
    </Container>
  );
}
