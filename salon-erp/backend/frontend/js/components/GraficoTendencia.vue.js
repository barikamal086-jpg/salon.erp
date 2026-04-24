const GraficoTendencia = {
  template: `
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-lg font-bold text-gray-900 mb-4">📈 Gráfico de Tendência</h3>

      <!-- Seletor de Período (copiado do SeletorPeriodo) -->
      <div class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Data Início</label>
            <input
              v-model="dataInicio"
              type="date"
              @change="atualizarPeriodo"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Data Fim</label>
            <input
              v-model="dataFim"
              type="date"
              @change="atualizarPeriodo"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Atalhos</label>
            <div class="flex gap-2">
              <button
                @click="setUltimos7Dias"
                class="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
              >
                7d
              </button>
              <button
                @click="setUltimos30Dias"
                class="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
              >
                30d
              </button>
              <button
                @click="setEsteMes"
                class="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
              >
                Mês
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Gráfico -->
      <div class="w-full">
        <canvas id="graficoTendencia" height="80"></canvas>
      </div>
    </div>
  `,
  data() {
    return {
      chart: null,
      dataInicio: this.obterDataInicio(),
      dataFim: this.obterDataFim(),
      periodo: {
        dataInicio: this.obterDataInicio(),
        dataFim: this.obterDataFim()
      }
    };
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
    async carregarDadosGrafico() {
      try {
        const response = await api.obterDadosGrafico(this.periodo.dataInicio, this.periodo.dataFim);
        if (response.data.success) {
          const dados = response.data.data;
          const labels = dados.map(d => this.formatarData(d.data));
          const valores = dados.map(d => parseFloat(d.receita || 0));
          this.renderizarGrafico(labels, valores);
        }
      } catch (error) {
        console.error('Erro ao carregar gráfico:', error);
      }
    },
    adicionarDias(data, dias) {
      const date = new Date(data);
      date.setDate(date.getDate() + dias);
      return date.toISOString().split('T')[0];
    },
    renderizarGrafico(labels, valores) {
      const canvas = document.getElementById('graficoTendencia');
      if (!canvas) return;

      if (this.chart) {
        this.chart.destroy();
      }

      const ctx = canvas.getContext('2d');
      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Faturamento Diário (R$)',
            data: valores,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: true, position: 'top' },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `R$ ${context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                }
              }
            }
          }
        }
      });
    },
    formatarData(data) {
      const opcoes = { month: '2-digit', day: '2-digit' };
      return new Date(data).toLocaleDateString('pt-BR', opcoes);
    },
    atualizarPeriodo() {
      // Garantir que data fim não é menor que data início
      if (this.dataFim < this.dataInicio) {
        this.dataFim = this.dataInicio;
      }
      this.periodo.dataInicio = this.dataInicio;
      this.periodo.dataFim = this.dataFim;
      this.carregarDadosGrafico();
    },
    setUltimos7Dias() {
      const hoje = new Date();
      const inicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
      this.dataInicio = inicio.toISOString().split('T')[0];
      this.dataFim = hoje.toISOString().split('T')[0];
      this.atualizarPeriodo();
    },
    setUltimos30Dias() {
      const hoje = new Date();
      const inicio = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
      this.dataInicio = inicio.toISOString().split('T')[0];
      this.dataFim = hoje.toISOString().split('T')[0];
      this.atualizarPeriodo();
    },
    setEsteMes() {
      const hoje = new Date();
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      this.dataInicio = inicio.toISOString().split('T')[0];
      this.dataFim = hoje.toISOString().split('T')[0];
      this.atualizarPeriodo();
    },
    atualizarGrafico(periodo) {
      if (periodo) {
        this.periodo = periodo;
      }
      this.carregarDadosGrafico();
    }
  },
  mounted() {
    this.carregarDadosGrafico();

    // Guardar referência global para o seletor de período
    window.graficoTendenciaInstance = this;
  }
};

// Expor o componente globalmente para Vue registrar
window.GraficoTendencia = GraficoTendencia;
