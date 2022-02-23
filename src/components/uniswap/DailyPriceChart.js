import { Fragment, useContext, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectBaseToken, selectPool, selectPoolDayData } from "../../store/pool";
import { parsePrice } from "../../helpers/numbers";
import { selectSelectedStrategyRanges } from "../../store/strategyRanges";
import CandleChart from "../charts/CandleChart";
import { ChartContext } from "../charts/ChartContainer";

const dailyCandleData = (data, baseSymbol, quoteSymbol) => {

  const candleData = {}
  candleData[baseSymbol] = [];
  candleData[quoteSymbol] = [];

  data.forEach((d, i) => {

    const yesterday = data[ Math.min((data.length - 1), i + 1) ];

    candleData[baseSymbol].push({ 
      date: d.date, 
      close: parseFloat(d.close) || 0, 
      open: parseFloat(yesterday.close) || 0,
      min: parseFloat(Math.min(d.close, yesterday.close)) || 0,
      max: parseFloat(Math.max(d.close, yesterday.close)) || 0,
      high: parseFloat(d.high) || 0,
      low: parseFloat(d.low) || 0,
      green: parseFloat(d.close) > parseFloat(yesterday.close) ? 1 : 0
    });

    candleData[quoteSymbol].push({ 
      date: d.date, 
      close: parseFloat(d.close) === 0 ? 0 : 1 / parseFloat(d.close) || 0, 
      open: parseFloat(yesterday.close) === 0 ? 0 : 1 / parseFloat(yesterday.close) || 0,
      min: parseFloat(d.close) === 0 ? 0 : 1 / parseFloat(Math.min(d.close, yesterday.close)) || 0,
      max: parseFloat(d.close) === 0 ? 0 : 1 / parseFloat(Math.max(d.close, yesterday.close)) || 0,
      high: parseFloat(d.close) === 0 ? 0 : 1 / parseFloat(d.high) || 0,
      low: parseFloat(d.close) === 0 ? 0 : 1 / parseFloat(d.low) || 0,
      green: parseFloat(d.close) > parseFloat(yesterday.close) ? 1 : 0
    });

  });

  return candleData;
}

const StrategyRangeOverlay = (props) => {
  return (
    <rect
      x={props.line.x}
      y={props.line.y}
      width={props.line.width}
      height={props.line.height}
      fill={props.color}
      stroke={props.color}
      fillOpacity={0.1}>
    </rect>
  )
}

const StrategyOverlays = (props) => {

  const chartContextData = useContext(ChartContext);

  if (props.strategyRanges && chartContextData && chartContextData.chartWidth && chartContextData.scale) {
    return (
      props.strategyRanges.map(d => {
        return <StrategyRangeOverlay 
          line={{ x: 0, width: chartContextData.chartWidth , y: chartContextData.scale.y(d.inputs.max.value), height: chartContextData.scale.y(d.inputs.min.value) - chartContextData.scale.y(d.inputs.max.value)}}
          color={d.color}>
          </StrategyRangeOverlay>
      })
    )
  }
  
  return <Fragment></Fragment>
}
 
 
 export default function DailyPriceChart (props) {

  const dailyPrices = useSelector(selectPoolDayData);
  const pool = useSelector(selectPool);
  const strategyRanges = useSelector(selectSelectedStrategyRanges);
  const baseToken = useSelector(selectBaseToken);

  const [candleData, setCandleData] = useState();
  const [chartData, setChartData] = useState();
  const [chartDomain, setChartDomain] = useState();
  const [mouseOverText, setMouseOverText] = useState();

  // <rect
  // x={max2Line.x1}
  // y={max2Line.y1}
  // width={max2Line.x2}
  // height={(min2Line.y2 - max2Line.y2)}
  // fill="#AF81E4"
  // fillOpacity={props.s2Selected ? 0.1 : 0}
  // ></rect>

  // setMin1Line({x1: 0, x2: width , y1: y(props.minLimit1), y2: y(props.minLimit1)});
  // setMax1Line({x1: 0, x2: width , y1: y(props.maxLimit1), y2: y(props.maxLimit1)});
  // setMin2Line({x1: 0, x2: width , y1: y(props.minLimit2), y2: y(props.minLimit2)});
  // setMax2Line({x1: 0, x2: width , y1: y(props.maxLimit2), y2: y(props.maxLimit2)});

  const chartProps = { scaleTypeX: "band", scaleTypeY:"linear", 
  dataTypeX: "date", dataTypeY: "number", ylabel: `Price ${baseToken.symbol}` , xlabel: "" }

  useEffect(() => {
    if (dailyPrices && pool && pool.token0) {
      setCandleData(dailyCandleData(dailyPrices, pool.token0.symbol , pool.token1.symbol));
    }
  }, [dailyPrices, pool]);

  useEffect(() => {
    if (baseToken && candleData && candleData[baseToken.symbol]) {
      setChartData(candleData[baseToken.symbol]);
    }
  }, [baseToken, candleData]);

  const handleMouseOver = (xEvent, scale) => {
    if (chartData && chartData[0] && scale) {

      const dates = chartData.map( d => d.date ); 
      const idx = dates.findIndex(d => d === scale.x.invert(xEvent));

      const date = new Date(chartData[idx].date * 1000);
      const formattedDate = date.getUTCDate() + '/' + (date.getUTCMonth() + 1) + '/' + date.getUTCFullYear();

      const x = `Date: ${formattedDate}`
      const close = `Close: ${parsePrice(chartData[idx].close)}`;
      const open = `Open: ${parsePrice(chartData[idx].open)}`;
      const high = `High: ${parsePrice(chartData[idx].high)}`;
      const low = `Low: ${parsePrice(chartData[idx].low)}`;

      setMouseOverText([x, close, open, high, low]);
    }
  }

  useEffect(() => {

    if ( chartData && strategyRanges && pool && pool.normStd ) {
      const selectedStrategies = strategyRanges.filter(d => d.selected === true);
      const yMax = Math.max(...chartData.map(d => d.high), ...selectedStrategies.map(d => d.inputs.max.value))
      const yMin = Math.min(...chartData.map(d => d.low), ...selectedStrategies.map(d => d.inputs.min.value))

      if (pool.normStd === 1) {
        setChartDomain({x: chartData.map(d => d.date).reverse(), y: [yMin * .9 , yMax * 1.1]});
      }
      else {
        setChartDomain({x: chartData.map(d => d.date).reverse(), y: [yMin * (1 - (pool.normStd / 100)) , yMax * (1 + (pool.normStd / 100))]});
      }
    }
  }, [strategyRanges, chartData, pool])

  return (
    <CandleChart
      className={`${props.className} inner-glow`} 
      mouseOverText={mouseOverText} handleMouseOver={handleMouseOver}
      data={chartData} domain={chartDomain}
      avgLine={false} chartProps={chartProps}
      mouseOverMarker={true}>
        <StrategyOverlays strategyRanges={strategyRanges}></StrategyOverlays>
    </CandleChart>
  )
  
}