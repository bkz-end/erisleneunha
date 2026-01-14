"use client";

/**
 * Services Management Page
 * 
 * Requirements:
 * - 4.4: Gestão de serviços (criar, editar, excluir) com campos: nome, preço, duração
 */

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import type { Service } from "@/types/database";

interface ServiceFormData {
  name: string;
  price: string;
  duration: string;
}

const initialFormData: ServiceFormData = {
  name: "",
  price: "",
  duration: "",
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Form state
  const [formData, setFormData] = useState<ServiceFormData>(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Fetch services on mount
  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    try {
      setLoading(true);
      const response = await fetch("/api/services");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar serviços");
      }
      
      setServices(data.services || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar serviços");
    } finally {
      setLoading(false);
    }
  }

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function handleInputChange(field: keyof ServiceFormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  function handleEdit(service: Service) {
    setFormData({
      name: service.name,
      price: service.price.toString(),
      duration: service.duration.toString(),
    });
    setEditingId(service.id);
    setShowForm(true);
    clearMessages();
  }

  function handleCancelEdit() {
    setFormData(initialFormData);
    setEditingId(null);
    setShowForm(false);
    clearMessages();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearMessages();
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration, 10),
      };

      // Validate
      if (!payload.name) {
        throw new Error("Nome é obrigatório");
      }
      if (isNaN(payload.price) || payload.price < 0) {
        throw new Error("Preço inválido");
      }
      if (isNaN(payload.duration) || payload.duration <= 0) {
        throw new Error("Duração inválida");
      }

      const url = editingId ? `/api/services/${editingId}` : "/api/services";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar serviço");
      }

      setSuccess(editingId ? "Serviço atualizado com sucesso!" : "Serviço criado com sucesso!");
      setFormData(initialFormData);
      setEditingId(null);
      setShowForm(false);
      await fetchServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar serviço");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Tem certeza que deseja excluir o serviço "${name}"?`)) {
      return;
    }

    clearMessages();

    try {
      const response = await fetch(`/api/services/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir serviço");
      }

      setSuccess("Serviço excluído com sucesso!");
      await fetchServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir serviço");
    }
  }

  function formatPrice(price: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  }

  function formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }

  return (
    <main className="min-h-screen bg-neutral-soft p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link 
              href="/admin" 
              className="text-rose-gold hover:text-rose-gold-dark text-sm mb-2 inline-block"
            >
              ← Voltar ao Dashboard
            </Link>
            <h1 className="font-display text-3xl text-rose-gold-dark">
              Gestão de Serviços
            </h1>
          </div>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); clearMessages(); }}
              className="bg-rose-gold hover:bg-rose-gold-dark text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              + Novo Serviço
            </button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-xl shadow-soft mb-8">
            <h2 className="font-display text-xl text-rose-gold-dark mb-4">
              {editingId ? "Editar Serviço" : "Novo Serviço"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Serviço
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-gold focus:border-transparent outline-none transition-all"
                  placeholder="Ex: Corte de Cabelo"
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                    Preço (R$)
                  </label>
                  <input
                    type="number"
                    id="price"
                    value={formData.price}
                    onChange={(e) => handleInputChange("price", e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-gold focus:border-transparent outline-none transition-all"
                    placeholder="0.00"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                    Duração (minutos)
                  </label>
                  <input
                    type="number"
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => handleInputChange("duration", e.target.value)}
                    required
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-gold focus:border-transparent outline-none transition-all"
                    placeholder="30"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-rose-gold hover:bg-rose-gold-dark text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={submitting}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Services List */}
        <div className="bg-white rounded-xl shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-display text-xl text-rose-gold-dark">
              Serviços Cadastrados
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Carregando serviços...
            </div>
          ) : services.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum serviço cadastrado ainda.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {services.map((service) => (
                <div
                  key={service.id}
                  className={`p-4 flex items-center justify-between hover:bg-pastel-cream transition-colors ${
                    !service.active ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{service.name}</h3>
                      {!service.active && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {formatPrice(service.price)} • {formatDuration(service.duration)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(service)}
                      className="text-rose-gold hover:text-rose-gold-dark px-3 py-1 rounded transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(service.id, service.name)}
                      className="text-red-500 hover:text-red-700 px-3 py-1 rounded transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
