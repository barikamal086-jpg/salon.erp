const KPIs = {
  template: `
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-lg font-bold text-gray-900 mb-6">📊 Indicadores de Performance</h3>

      <!-- Cards de KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Total -->
        <div class="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
          <p class="text-gray-600 text-sm font-medium">💰 Total</p>
          <p class="text-3xl font-bold text-blue-600 mt-2">
            R$ {{ formatarValor(stats.total) }}
          </p>
        </div>

        <!-- Média Diária -->
        <div class="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
          <p class="text-gray-600 text-sm font-medium">📊 Média Diária</p>
          <p class="text-3xl font-bold text-green-600 mt-2">
            R$ {{ formatarValor(stats.media) }}
          </p>
        </div>

        <!-- Maior Dia -->
        <div class="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
          <p class="text-gray-600 text-sm font-medium">⬆️ Maior Dia</p>
          <p class="text-3xl font-bold text-purple-600 mt-2">
            R$ {{ formatarValor(stats.maior) }}
          </p>
        </div>

        <!-- Menor Dia -->
        <div class="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
          <p class="text-gray-600 text-sm font-medium">⬇️ Menor Dia</p>
          <p class="text-3xl font-bold text-orange-600 mt-2">
            R$ {{ formatarValor(stats.menor) }}
          </p>
        </div>

        <!-- Total de Dias -->
        <div class="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
          <p class="text-gray-600 text-sm font-medium">📅 Dias</p>
          <p class="text-3xl font-bold text-red-600 mt-2">
            {{ stats?.dias || 0 }}
          </p>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      periodo: {
        dataInicio: this.obterDataInicio(),
        dataFim: this.obterDataFim()
      },
      stats: {
        total: 0,
        media: 0,
        maior: 0,
        menor: 0,
        dias: 0
      }
    };
  },
  watch: {
    periodo: {
      handler() {
        this.carregarStats();
      },
      deep: true
    }
  },
  methods: {
    obterDataInicio() {
      const hoje = new Date();
      const inicio = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
      return inicio.toISOString().split('T')[0];
    },
    obterDataFim() {
      const hoje = new Date();
      return hoje.toISOString().split('T')[0];
    },
    async carregarStats() {
      try {
        // Adicionar 1 dia à data fim para incluir o dia completo (até 23:59:59)
        const dataFimAjustada = this.adicionarDias(this.periodo.dataFim, 1);
        const response = await api.obterStats(this.periodo.dataInicio, dataFimAjustada);
        if (response.data.success) {
          this.stats = response.data.data;
          this.$emit('periodo-alterado', {
            dataInicio: this.periodo.dataInicio,
            dataFim: dataFimAjustada
          });
        }
      } catch (error) {
        console.error('Erro ao carregar stats:', error);
      }
    },
    adicionarDias(data, dias) {
      const date = new Date(data);
      date.setDate(date.getDate() + dias);
      return date.toISOString().split('T')[0];
    },
    formatarValor(valor) {
      return parseFloat(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  },
  mounted() {
    this.carregarStats();
  }
};
