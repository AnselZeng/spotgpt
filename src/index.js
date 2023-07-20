import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import Router from "./App";
import { ChakraProvider } from "@chakra-ui/react";

ReactDOM.render(
  <ChakraProvider>
    <React.StrictMode>
      <Router />
    </React.StrictMode>
  </ChakraProvider>,
  document.getElementById("root")
);
