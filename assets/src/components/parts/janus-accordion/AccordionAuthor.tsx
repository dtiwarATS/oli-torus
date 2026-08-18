import React, { useEffect, useState } from 'react';
import { AuthorPartComponentProps } from 'components/parts/types/parts';
import AccordionView, { tagName } from './AccordionView';
import { parseAccordionModel } from './accordion-util';
import { AccordionModel } from './schema';

const AccordionAuthor: React.FC<AuthorPartComponentProps<AccordionModel>> = (props) => {
  const { id } = props;
  const model = parseAccordionModel(props.model);
  const [expandedSections, setExpandedSections] = useState<number[]>([]);

  useEffect(() => {
    props.onReady({ id: `${id}` });
  }, []);

  return (
    <AccordionView
      id={id}
      model={model}
      expandedSections={expandedSections}
      enabled={true}
      onToggle={(sectionIndex) => {
        setExpandedSections((current) =>
          current.includes(sectionIndex)
            ? current.filter((index) => index !== sectionIndex)
            : [...current, sectionIndex].sort((a, b) => a - b),
        );
      }}
      className="janus-accordion-author"
    />
  );
};

export { tagName };
export default AccordionAuthor;
