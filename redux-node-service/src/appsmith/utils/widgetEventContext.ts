import React, { useContext, useEffect } from "react";
import CustomEventListener from "./CustomEventListener";

interface WidgetEventContextProps {
  eventHandler: CustomEventListener;
}

export const WidgetEventContext = React.createContext<WidgetEventContextProps>({
  eventHandler: new CustomEventListener(),
});

export const WidgetEventProvider = WidgetEventContext.Provider;

interface WidgetEventProps {
  [eventName: string]: (...args: any[]) => void;
}

export const useWidgetEventListener = (props: WidgetEventProps) => {
  const { eventHandler } = useContext(WidgetEventContext);

  useEffect(() => {
    Object.keys(props).forEach((eventName) => {
      eventHandler.addListener(eventName, props[eventName]);
    });

    return () => {
      Object.keys(props).forEach((eventName) => {
        eventHandler.removeListener(eventName, props[eventName]);
      });
    };
  }, []);
};
