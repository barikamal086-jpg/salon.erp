const TabelaHistorico = {
  template: `
    <div class="mt-12">
      <div class="bg-white rounded-lg shadow">
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-900">📊 Histórico de Faturamentos</h2>

            <!-- Filtro por Status -->
            <select
              :value="filtroStatus"
              @change="$emit('filtro-alterado', $event.target.value)"
              class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="pending">⏳ Pendente</option>
              <option value="sent">✅ Enviado</option>
            </select>
          </div>

          <!-- Tabela responsiva -->
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-100 border-b">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold text-gray-700">Data</th>
                  <th class="px-4 py-3 text-right font-semibold text-gray-700">Total</th>
                  <th class="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                  <th class="px-4 py-3 text-center font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="receitas.length === 0" class="border-b">
                  <td colspan="4" class="px-4 py-6 text-center text-gray-500">
                    Nenhum faturamento registrado
                  </td>
                </tr>
                <tr v-for="receita in receitas" :key="receita.id" class="border-b hover:bg-gray-50">
                  <td class="px-4 py-3">
                    {{ formatarData(receita.data) }}
                  </td>
                  <td class="px-4 py-3 text-right font-semibold">
                    R$ {{ formatarValor(receita.total) }}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span v-if="receita.status" class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      ✅ Enviado
                    </span>
                    <span v-else class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                      ⏳ Pendente
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <div class="flex justify-center gap-2">
                      <button
                        v-if="!receita.status"
                        @click="$emit('enviar-conta-azul', receita.id)"
                        class="text-blue-600 hover:text-blue-800 font-medium text-xs"
                        title="Enviar ao Conta Azul"
                      >
                        📤 Enviar
                      </button>
                      <button
                        @click="$emit('editar-receita', receita.id)"
                        class="text-blue-600 hover:text-blue-800 font-medium text-xs"
                        title="Editar"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        @click="$emit('deletar-receita', receita.id)"
                        class="text-red-600 hover:text-red-800 font-medium text-xs"
                        title="Deletar"
                      >
                        🗑️ Deletar
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  props: {
    receitas: {
      type: Array,
      required: true
    },
    filtroStatus: {
      type: String,
      default: ''
    }
  },
  methods: {
    formatarData(data) {
      const opcoes = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
      return new Date(data).toLocaleDateString('pt-BR', opcoes);
    },
    formatarValor(valor) {
      return parseFloat(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  }
};
