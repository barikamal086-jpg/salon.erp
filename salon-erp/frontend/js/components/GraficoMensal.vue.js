const GraficoMensal = {
  template: `
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-lg font-bold text-gray-900 mb-4">📊 Receitas vs Despesas por Dia</h3>

      <!-- Seletor de Mês -->
      <div class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Mês</label>
            <select
              v-model="mesSelecionado"
              @change="carregarDadosMensal"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="01">Janeiro</option>
              <option value="02">Fevereiro</option>
              <option value="03">Março</option>
              <option value="04">Abril</option>
              <option value="05">Maio</option>
              <option value="06">Junho</option>
              <option value="07">Julho</option>
              <option value="08">Agosto</option>
              <option value="09">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Ano</label>
            <input
              v-model="anoSelecionado"
              type="number"
              @change="carregarDadosMensal"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
        </div>
      </div>

      <!-- Gráfico -->
      <div class="w-full">
        <canvas id="graficoMensal" height="80"></canvas>
      </div>
    </div>
  `,
  data() {
    const hoje = new Date();
    return {
      chart: null,
      mesSelecionado: String(hoje.getMonth() + 1).padStart(2, '0'),
      anoSelecionado: hoje.getFullYear()
    };
  },
  methods: {
    async carregarDadosMensal() {
      try {
        // Construir datas: primeiro e último dia do mês
        const dataInicio = `${this.anoSelecionado}-${this.mesSelecionado}-01`;
        const ultimoDia = new Date(this.anoSelecionado, parseInt(this.mesSelecionado), 0).getDate();
        const dataFim = `${this.anoSelecionado}-${this.mesSelecionado}-${ultimoDia}`;

        console.log('📊 Carregando dados do mês:', { dataInicio, dataFim });

        const response = await api.obterDadosGrafico(dataInicio, dataFim);

        if (response.data.success) {
          const dados = response.data.data;
          console.log('✅ Dados recebidos:', dados);

          // Criar array com todos os dias do mês
          const diasDoMes = [];
          for (let i = 1; i <= ultimoDia; i++) {
            diasDoMes.push(i);
          }

          // Mapear receitas e despesas por dia
          const receitas = diasDoMes.map(dia => {
            const registro = dados.find(d => {
              const [ano, mes, dia_str] = d.data.split('-');
              return parseInt(dia_str) === dia;
            });
            return registro ? parseFloat(registro.receita || 0) : 0;
          });

          const despesas = diasDoMes.map(dia => {
            const registro = dados.find(d => {
              const [ano, mes, dia_str] = d.data.split('-');
              return parseInt(dia_str) === dia;
            });
            return registro ? parseFloat(registro.despesa || 0) : 0;
          });

          this.renderizarGrafico(diasDoMes, receitas, despesas);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar gráfico mensal:', error);
      }
    },

    renderizarGrafico(dias, receitas, despesas) {
      const canvas = document.getElementById('graficoMensal');
      if (!canvas) return;

      if (this.chart) {
        this.chart.destroy();
      }

      const ctx = canvas.getContext('2d');
      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: dias,
          datasets: [
            {
              label: 'Receitas (R$)',
              data: receitas,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointBackgroundColor: '#10b981',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointHoverRadius: 6
            },
            {
              label: 'Despesas (R$)',
              data: despesas,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointBackgroundColor: '#ef4444',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointHoverRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: true, position: 'top' },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: R$ ${context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    }
  },
  mounted() {
    this.carregarDadosMensal();

    // Guardar referência global
    window.graficoMensalInstance = this;
  }
};

// Expor o componente globalmente para Vue registrar
window.GraficoMensal = GraficoMensal;
