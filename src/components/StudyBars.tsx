export function StudyBars({ data }: { data: { name: string; minutes: number }[] }) {
  const max = Math.max(60, ...data.map((d) => d.minutes))
  const ticks = [max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0]
  return (
    <div
      className="study-chart"
      role="img"
      aria-label={data.map((d) => d.name + ' ' + d.minutes + ' minutes').join(', ')}
    >
      <div className="chart-axis">
        {ticks.map((tick, i) => (
          <span key={i}>{tick}m</span>
        ))}
      </div>
      <div className="chart-area">
        <div className="chart-grid">
          {ticks.map((_, i) => (
            <i key={i} />
          ))}
        </div>
        <div className="chart-columns">
          {data.map((day, i) => (
            <div key={i}>
              <span
                className={'chart-bar ' + (day.minutes === max ? 'strong' : '')}
                title={day.name + ' · ' + day.minutes + ' min'}
                style={{ height: Math.max(day.minutes ? 3 : 1, (day.minutes / max) * 100) + '%' }}
              />
              <small>{day.name}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
