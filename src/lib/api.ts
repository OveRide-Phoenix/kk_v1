export async function getCityByPhone(phone: string): Promise<string | null> {
    const res = await fetch(`/api/get-city?phone=${phone}`);
    const data = await res.json();
    return data.city || null;
  }
  
  export async function getAvailableCities(): Promise<string[]> {
    const res = await fetch("/api/get-cities");
    const data = await res.json();
    return data.cities;
  }
  
  export async function registerUser(userData: any): Promise<{ success: boolean }> {
    const res = await fetch("/api/register", {
      method: "POST",
      body: JSON.stringify(userData),
      headers: { "Content-Type": "application/json" },
    });
    return res.json();
  }
  