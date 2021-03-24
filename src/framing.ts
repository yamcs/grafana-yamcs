import { FieldType, MutableDataFrame } from '@grafana/data';
import * as utils from './utils';
import { ParameterRange } from './YamcsClient';

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

export function frameParameterRanges(refId: string, ranges: ParameterRange[]): MutableDataFrame {
    const frame = new MutableDataFrame({
        refId,
        fields: [{
            name: 'time',
            type: FieldType.time,
        }, {
            name: 'value',
            type: FieldType.string,
        }],
    });


    const substitutions = new Map<string, Substitution>();

    const points = [];
    const uniqueReturnedValues = new Set<string>();
    for (const range of ranges) {
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

    const time = parseTime(range.timeStart);
    const result: MostFrequentValues = {
        point: { time, value: mostFrequentValue, count: mostFrequentCount }
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
