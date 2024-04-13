import { FieldType, MutableDataFrame } from '@grafana/data';
import { ParameterRange } from './YamcsClient';
import * as utils from './utils';

interface MostFrequentValues {
  // The most frequent value in a range
  point: DataPoint;

  // The most frequent value in a range, excluding the 'Other' category
  altPoint?: DataPoint;
}

interface DataPoint {
  time: number;
  value: string | null;
  count: number;
}

interface Substitution {
  target: DataPoint;
  replacement: DataPoint;
}

export function frameParameterRanges(
  refId: string,
  requestStart: number,
  requestStop: number,
  ranges: ParameterRange[],
  unit?: string
): MutableDataFrame {
  const frame = new MutableDataFrame({
    refId,
    fields: [
      {
        name: 'time',
        type: FieldType.time,
      },
      {
        name: 'value',
        type: FieldType.string,
        config: { unit },
      },
    ],
  });

  const substitutions = new Map<string, Substitution>();
  const points = [];
  const uniqueReturnedValues = new Set<string>();

  // Leading gap
  if (ranges.length) {
    const firstRangeStart = parseTime(ranges[0].start || ranges[0].timeStart);
    if (firstRangeStart > requestStart) {
      points.push({ time: requestStart, value: null, count: 0 });
    }
  }

  let previousStop;
  for (const range of ranges) {
    const start = parseTime(range.start || range.timeStart);

    // Insert a gap
    if (previousStop && previousStop !== start) {
      points.push({ time: previousStop, value: null, count: 0 });
    }

    const result = extractMostFrequentValues(range);
    points.push(result.point);
    if (result.point.value !== null) {
      uniqueReturnedValues.add(result.point.value);
    }

    // If the non-other category is the largest among all ranges,
    // then keep track of it for (potential) later substitution.
    if (result.altPoint) {
      const altPoint = result.altPoint;
      const existingSubstitution = substitutions.get(altPoint.value!);
      if (!existingSubstitution || existingSubstitution.replacement.count < altPoint.count) {
        substitutions.set(altPoint.value!, {
          target: result.point,
          replacement: altPoint,
        });
      }
    }

    previousStop = parseTime(range.stop || range.timeStop);
  }

  // Trailing gap
  const tolerance = (requestStop - requestStart) * 0.01;
  if (previousStop && requestStop - previousStop > tolerance) {
    points.push({ time: previousStop, value: null, count: 0 });
  }

  for (const substitution of substitutions.values()) {
    const value = substitution.replacement.value!;
    if (!uniqueReturnedValues.has(value)) {
      substitution.target.value = substitution.replacement.value;
    }
  }

  for (const point of points) {
    frame.add(point);
  }
  return frame;
}

function extractMostFrequentValues(range: ParameterRange): MostFrequentValues {
  let mostFrequentNonOtherValue = null;
  let mostFrequentNonOtherCount = 0;
  let engValueCount = 0;
  for (let i = 0; i < range.engValues?.length; i++) {
    engValueCount += range.counts[i];
    if (range.counts[i] > mostFrequentNonOtherCount) {
      mostFrequentNonOtherValue = utils.printValue(range.engValues[i]);
      mostFrequentNonOtherCount = range.counts[i];
    }
  }

  let mostFrequentValue = null;
  let mostFrequentCount = 0;
  let otherCount = range.count - engValueCount;
  if (otherCount > mostFrequentNonOtherCount) {
    mostFrequentValue = 'Other';
    mostFrequentCount = otherCount;
  } else {
    mostFrequentValue = mostFrequentNonOtherValue;
    mostFrequentCount = mostFrequentNonOtherCount;
  }

  const time = parseTime(range.start || range.timeStart);
  const result: MostFrequentValues = {
    point: { time, value: mostFrequentValue, count: mostFrequentCount },
  };
  if (mostFrequentNonOtherCount > 0) {
    result.altPoint = {
      time,
      value: mostFrequentNonOtherValue,
      count: mostFrequentNonOtherCount,
    };
  }
  return result;
}

function parseTime(isostring: string): number {
  const date = new Date(Date.parse(isostring));
  return date.getTime();
}
