import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { AuthorPartComponentProps } from 'components/parts/types/parts';
import { clone } from 'utils/common';
import { SliderModel } from './schema';

const SliderAuthor: React.FC<AuthorPartComponentProps<SliderModel>> = (props) => {
  const { id, model, onSaveConfigure } = props;

  const {
    z,
    label,
    maximum = 1,
    minimum = 0,
    snapInterval,
    showDataTip,
    showValueLabels,
    showLabel,
    showTicks,
    invertScale,
  } = model;

  const styles: CSSProperties = {
    width: '100%',
    flexDirection: showLabel ? 'column' : 'row',
  };
  const inputStyles: CSSProperties = {
    width: '100%',
    height: `3px`,
    zIndex: z,
    direction: invertScale ? 'rtl' : 'ltr',
  };
  const divStyles: CSSProperties = {
    width: '100%',
    display: `flex`,
    flexDirection: 'row',
    alignItems: 'center',
  };

  const [inputInnerWidth, setInputInnerWidth] = useState<number>(0);
  const [spanInnerWidth, setSpanInnerWidth] = useState<number>(0);

  const [sliderValue, _setSliderValue] = useState(0);

  useEffect(() => {
    // all activities *must* emit onReady
    props.onReady({ id: `${props.id}` });
  }, []);

  const inputWidth = inputInnerWidth;
  const thumbWidth = spanInnerWidth;
  const thumbHalfWidth = thumbWidth / 2;
  const thumbPosition =
    ((Number(sliderValue) - minimum) / (maximum - minimum)) *
    (inputWidth - thumbWidth + thumbHalfWidth);
  const thumbMargin = thumbHalfWidth * -1 + thumbHalfWidth / 2;

  const inputTargetRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputTargetRef && inputTargetRef.current) {
      setInputInnerWidth(inputTargetRef?.current?.offsetWidth);
    }
  });

  const divTargetRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (divTargetRef && divTargetRef.current) {
      setSpanInnerWidth(divTargetRef?.current?.offsetWidth);
    }
  });
  const getTickOptions = () => {
    if (snapInterval) {
      const options = [];
      const numberOfTicks = (maximum - minimum) / snapInterval;
      const numberOfTicksThreshold = 100;
      if (numberOfTicks > numberOfTicksThreshold) {
        const modelClone = clone(model);
        const snapIntervalThreshold = (maximum - minimum) / numberOfTicksThreshold;
        // As per the requirement, Users cannot enter a value that divides the slider into more than 100 equal sections.
        // if it goes beyond that, we need to calculate the snapIntervalThreshold between the min and max values
        // and set the interval
        modelClone.snapInterval = +snapIntervalThreshold.toFixed(2);
        //we need to save the snapInterval so that the custom property is updated with adjusted values
        onSaveConfigure({ id, snapshot: modelClone });
        return;
      }
      for (let i = 0; i <= numberOfTicks; i++) {
        options.push(<option value={i * snapInterval}></option>);
      }
      return options;
    }
  };
  const internalId = `${id}__slider`;
  const textOptions = ['Label 1', 'Label 2', 'Label 3', 'Label 4', 'Label 5'];

  const [value, setValue] = useState(0);
  const sliderRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(Number(e.target.value));
  };

  const getThumbPosition = () => {
    if (!sliderRef.current) return '0%';
    const range = sliderRef.current;
    const percent = (value / (textOptions.length - 1)) * 100;
    return `calc(${percent}% - 10px)`; // 10px = half of thumb width
  };

  const handleTickClick = (index: number) => {
    setValue(index);
  };
  return (
    <div data-janus-type={tagName} style={styles} className={`slider text-slider-container`}>
      <style>
        {`.text-slider-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 10px;
}

.text-slider-title {
  font-size: 1.3em;
  font-weight: 600;
}

.slider-wrapper {
  position: relative;
  width: 100%;
}
.slider-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: #03A9F4 transparent transparent transparent; /* updated */
}
.slider-track {
  width: 100%;
  appearance: none;
  height: 6px;
  border-radius: 4px;
  background: #e0e0e0;
  outline: none;
  margin-bottom: 40px;
}


.tick-container {
  position: absolute;
  top: 6px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
}

.tick {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.tick-mark {
  width: 1px;
  height: 10px;
  background: #333;
}

.tick-label {
  margin-top: 8px;
  font-size: 0.9em;
  white-space: nowrap;
}

.slider-track::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 24px;
  width: 24px;
  border-radius: 50%;
  background-color: #03a9f4  !important;; /* updated */
  border: none;
  cursor: pointer;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  margin-top: -8px;
}

.slider-track::-moz-range-thumb {
  height: 24px;
  width: 24px;
  border-radius: 50%;
  background-color: #03a9f4  !important;; /* updated */
  border: none;
  cursor: pointer;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
}

/* Tooltip styles */
.slider-tooltip {
  position: absolute;
  transform: translateX(-50%);
  bottom: 35px;
  background-color: #03a9f4 !important;; /* updated */
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  font-weight: bold;
}

.slider-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: #03a9f4 transparent transparent transparent; /* updated */
}

.slider-track::-ms-thumb {
  height: 24px;
  width: 24px;
  border-radius: 50%;
  background-color: #03a9f4 !important;;
  border: none;
  cursor: pointer;
}
`}
      </style>
      <label className="text-slider-title">Text Slider</label>
      <div className="slider-wrapper">
        <input
          ref={sliderRef}
          type="range"
          min={0}
          max={textOptions.length - 1}
          step={1}
          value={value}
          onChange={handleChange}
          className="slider-track"
        />

        <div className="tick-container">
          {textOptions.map((label, index) => (
            <div key={index} className="tick" onClick={() => handleTickClick(index)}>
              <div className="tick-mark" />
              <div className="tick-label">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const tagName = 'janus-slider';

export default SliderAuthor;
