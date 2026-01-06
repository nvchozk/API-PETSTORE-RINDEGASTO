import { test, expect, APIRequestContext, APIResponse, TestInfo } from "@playwright/test";

type Pet = {
  id?: number;
  name?: string;
  photoUrls?: string[];
  status?: "available" | "pending" | "sold";
};

type Order = {
  id?: number;
  petId: number;
  quantity: number;
  shipDate?: string;
  status?: "placed" | "approved" | "delivered";
  complete?: boolean;
};

test.describe.serial("Tienda de Mascota - Suite API", () => {
  const createdPetIds = new Set<number>();
  const PET_LOOKUP_LIMIT = 10;
  const loginParams = {
    username: process.env.PETSTORE_USER ?? "JorgeQA",
    password: process.env.PETSTORE_PASS ?? "pass123",
  };

  let api: APIRequestContext;
  let petId: number;

  test.beforeAll(async ({ playwright, baseURL }) => {
    api = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        Accept: "application/json",
        api_key: "special-key",
      },
    });
  });

  async function captureResponse(testInfo: TestInfo, label: string, res: APIResponse) {
    const contentType = res.headers()["content-type"] ?? "";
    const text = await res.text();
    let json: unknown | undefined;

    if (contentType.includes("application/json") && text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = undefined;
      }
    }

    testInfo.attach(label, {
      body: json ? JSON.stringify(json, null, 2) : text,
      contentType: json ? "application/json" : "text/plain",
    });

    return { text, json };
  }

  function attachJson(testInfo: TestInfo, label: string, data: unknown) {
    testInfo.attach(label, {
      body: JSON.stringify(data, null, 2),
      contentType: "application/json",
    });
  }

  function assertPetShape(pet: Pet) {
    expect(pet).toBeTruthy();
    if (pet.id !== undefined) {
      expect(typeof pet.id).toBe("number");
    }
    if (pet.name !== undefined) {
      expect(typeof pet.name).toBe("string");
    }
    if (pet.photoUrls !== undefined) {
      expect(Array.isArray(pet.photoUrls)).toBe(true);
      for (const url of pet.photoUrls) {
        expect(typeof url).toBe("string");
      }
    }
    if (pet.status !== undefined) {
      expect(["available", "pending", "sold"]).toContain(pet.status);
    }
  }

  function assertOrderShape(order: Order) {
    expect(order).toBeTruthy();
    expect(typeof order.petId).toBe("number");
    expect(typeof order.quantity).toBe("number");
    if (order.id !== undefined) {
      expect(typeof order.id).toBe("number");
    }
    if (order.shipDate !== undefined) {
      expect(typeof order.shipDate).toBe("string");
    }
    if (order.status !== undefined) {
      expect(["placed", "approved", "delivered"]).toContain(order.status);
    }
    if (order.complete !== undefined) {
      expect(typeof order.complete).toBe("boolean");
    }
  }

  async function createPet(testInfo: TestInfo) {
    const id = Math.floor(Date.now() / 1000);
    const payload: Pet = {
      id,
      name: `pw-${id}`,
      photoUrls: ["https://example.com/pw.jpg"],
      status: "available",
    };

    attachJson(testInfo, `pet-create-request-${id}`, payload);
    const res = await api.post("pet", { data: payload });
    const { json } = await captureResponse(testInfo, `pet-created-${id}`, res);
    expect([200, 201]).toContain(res.status());

    const created = (json ?? {}) as Pet;
    assertPetShape(created);
    if (created.name !== undefined) {
      expect(created.name).toBe(payload.name);
    }
    if (created.status !== undefined) {
      expect(created.status).toBe(payload.status);
    }

    const createdId = created.id ?? id;
    createdPetIds.add(createdId);
    return createdId;
  }

  test.afterAll(async () => {
    for (const id of createdPetIds) {
      const res = await api.delete(`pet/${id}`);
      expect([200, 404]).toContain(res.status());
    }

    await api.dispose();
  });

  test("Login con credenciales de prueba", async () => {
    attachJson(test.info(), "login-request", {
      params: {
        ...loginParams,
        password: loginParams.password ? "****" : loginParams.password,
      },
    });
    const res = await api.get("user/login", { params: loginParams });
    const { text } = await captureResponse(test.info(), "login-response", res);

    expect([200, 400]).toContain(res.status());

    if (res.status() === 200) {
      expect(text.length).toBeGreaterThan(0);
    }
  });

  test("Listar mascotas disponibles", async () => {
    attachJson(test.info(), "list-available-request", { status: "available" });
    const res = await api.get("pet/findByStatus", {
      params: { status: "available" },
    });
    const { json } = await captureResponse(test.info(), "available-pets", res);

    expect(res.status()).toBe(200);

    expect(Array.isArray(json)).toBe(true);
    const pets = json as Pet[];
    expect(pets.length).toBeGreaterThan(0);

    for (const pet of pets.slice(0, 5)) {
      assertPetShape(pet);
    }

    const candidateIds = pets
      .map((pet) => pet.id)
      .filter((id): id is number => typeof id === "number" && id > 0);
    expect(candidateIds.length).toBeGreaterThan(0);

    // The public API sometimes returns ids that no longer exist.
    let selectedId: number | undefined;
    for (const id of candidateIds.slice(0, PET_LOOKUP_LIMIT)) {
      const check = await api.get(`pet/${id}`);
      if (check.status() === 200) {
        selectedId = id;
        break;
      }
    }

    petId = selectedId ?? (await createPet(test.info()));
    attachJson(test.info(), "pet-selected", { petId });
  });

  test("Consultar datos de una mascota por id", async () => {
    attachJson(test.info(), "pet-detail-request", { petId });
    let res = await api.get(`pet/${petId}`);
    let responseData = await captureResponse(test.info(), "pet-detail", res);
    if (res.status() === 404) {
      petId = await createPet(test.info());
      attachJson(test.info(), "pet-detail-request-retry", { petId });
      res = await api.get(`pet/${petId}`);
      responseData = await captureResponse(test.info(), "pet-detail-retry", res);
    }

    expect(res.status()).toBe(200);

    const pet = responseData.json as Pet;
    assertPetShape(pet);
    expect(pet.id).toBe(petId);
    expect(pet.name).toBeTruthy();
  });

  test("Crear una orden para la mascota seleccionada", async () => {
    const payload: Order = {
      id: Math.floor(Date.now() / 1000),
      petId,
      quantity: 1,
      shipDate: new Date().toISOString(),
      status: "placed",
      complete: false,
    };

    attachJson(test.info(), "order-request", payload);
    const res = await api.post("store/order", { data: payload });
    const { json } = await captureResponse(test.info(), "order-created", res);
    expect(res.status()).toBe(200);

    const order = json as Order;
    assertOrderShape(order);
    expect(order.petId).toBe(petId);
    expect(order.quantity).toBe(payload.quantity);
    if (order.status !== undefined) {
      expect(order.status).toBe(payload.status);
    }
    if (order.complete !== undefined) {
      expect(order.complete).toBe(payload.complete);
    }
  });
});
